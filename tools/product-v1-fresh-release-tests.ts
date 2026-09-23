#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-product-v1-release-"));
const packDir = path.join(tmp, "pack");
const host = path.join(tmp, "host");
fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(host, { recursive: true });

function run(command: string, args: string[], cwd: string, expected = 0) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env },
  });
  assert.equal(
    result.status,
    expected,
    `${command} ${args.join(" ")} exited ${result.status}, expected ${expected}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
}

function npm(args: string[], cwd: string) {
  const invocation = resolveNpmInvocation(args);
  return run(invocation.command, invocation.args, cwd);
}

function psc(pscPath: string, args: string[], cwd: string, expected = 0) {
  return run(process.execPath, [pscPath, ...args], cwd, expected);
}

function jsonStdout(result: ReturnType<typeof spawnSync>) {
  return JSON.parse(String(result.stdout));
}

try {
  // The release gate runs after the normal repository build. Every workspace
  // package whose public main points at dist/ must therefore be present in the
  // packed root distribution as prebuilt output.
  const requiredDist = [];
  for (const entry of fs.readdirSync(path.join(root, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageJsonPath = path.join(root, "packages", entry.name, "package.json");
    if (!fs.existsSync(packageJsonPath)) continue;
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (typeof packageJson.main !== "string" || !packageJson.main.startsWith("dist/")) continue;
    const relative = `packages/${entry.name}/${packageJson.main}`.replace(/\\/gu, "/");
    assert.ok(fs.existsSync(path.join(root, relative)), `repository must be built before release gate: missing ${relative}`);
    requiredDist.push(relative);
  }
  assert.ok(requiredDist.length >= 10, "expected a substantial prebuilt workspace package set");

  const dry = npm(["pack", "--dry-run", "--json"], root);
  const dryInfo = JSON.parse(dry.stdout)[0];
  const packedPaths = new Set((dryInfo.files ?? []).map((item: any) => String(item.path).replace(/\\/gu, "/")));
  for (const file of requiredDist) {
    assert.ok(packedPaths.has(file), `release tarball is missing prebuilt workspace output ${file}`);
  }
  for (const required of [
    "bin/psc.mjs",
    "tools/setup-local-workspaces.cts",
    "tools/link-local-workspaces.cts",
    "tools/copy-static-assets.ts",
    "config/proofscript-product-v1-completion.json",
    "config/proofscript-runtime-profile-v1.json",
    "examples/product-v1/cli-app/Main.ps",
  ]) {
    assert.ok(packedPaths.has(required), `release tarball is missing ${required}`);
  }

  const packed = npm(["pack", "--json", "--pack-destination", packDir], root);
  const packInfo = JSON.parse(packed.stdout)[0];
  const tarball = path.join(packDir, packInfo.filename);
  assert.ok(fs.existsSync(tarball));

  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({
    name: "proofscript-product-v1-fresh-host",
    version: "1.0.0",
    private: true,
  }, null, 2) + "\n");

  npm([
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    tarball,
  ], host);

  const installedRoot = path.join(host, "node_modules", "proofscript");
  const installedPsc = path.join(installedRoot, "bin", "psc.mjs");
  assert.ok(fs.existsSync(installedPsc));
  assert.equal(
    fs.existsSync(path.join(installedRoot, "node_modules", "typescript")),
    false,
    "fresh release dependency install must not rely on ProofScript devDependency TypeScript",
  );
  for (const file of requiredDist) {
    assert.ok(fs.existsSync(path.join(installedRoot, file)), `installed release is missing ${file}`);
  }

  const setup = psc(installedPsc, ["setup", "--prebuilt"], host);
  assert.match(setup.stdout, /PROOFSCRIPT_SETUP=PASS mode=prebuilt/u);
  assert.match(setup.stdout, /packaged prebuilt workspace outputs/u);
  assert.equal(
    fs.existsSync(path.join(installedRoot, "node_modules", "@proofscript", "compiler", "dist", "index.js")),
    true,
  );

  const doctor = jsonStdout(psc(installedPsc, ["doctor", "--json"], host));
  assert.equal(doctor.status, "accepted");
  assert.equal(doctor.requiresLean4, false);
  assert.equal(doctor.packageDist.ok, true);
  assert.equal(doctor.pscCheckCanRun.ok, true);

  const app = path.join(host, "fresh-app");
  const initialized = jsonStdout(psc(installedPsc, ["init", app, "--json"], host));
  assert.equal(initialized.status, "accepted");
  assert.ok(fs.existsSync(path.join(app, "src", "Main.ps")));

  const checked = jsonStdout(psc(installedPsc, ["check", "--json"], app));
  assert.equal(checked.status, "accepted");

  const built = jsonStdout(psc(installedPsc, ["build-js", "--json"], app));
  assert.equal(built.status, "accepted");
  assert.equal(built.target, "js");
  assert.ok(fs.existsSync(path.join(app, "dist", "Main.js")));

  const executed = jsonStdout(psc(installedPsc, ["run", "sample", "--json"], app));
  assert.equal(executed.status, "accepted");
  assert.equal(String(executed.result), "95");

  const formatCheck = jsonStdout(psc(installedPsc, ["fmt", "--check", "--json"], app));
  assert.equal(formatCheck.status, "accepted");

  console.log("PRODUCT_V1_FRESH_RELEASE_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
