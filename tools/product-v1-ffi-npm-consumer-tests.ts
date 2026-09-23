#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ffi-npm-"));
const app = path.join(tmp, "ffi-npm-app");
const host = path.join(tmp, "ffi-host-package");

function pscJson(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args, "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    expected,
    `psc ${args.join(" ")} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return JSON.parse(result.stdout);
}

try {
  fs.cpSync(path.join(root, "examples/product-v1/ffi-npm-app"), app, { recursive: true });
  fs.cpSync(path.join(root, "examples/product-v1/ffi-host-package"), host, { recursive: true });

  const npm = resolveNpmInvocation([
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
  const installed = spawnSync(npm.command, npm.args, {
    cwd: app,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    installed.status,
    0,
    `offline local npm install failed\nstdout:\n${installed.stdout}\nstderr:\n${installed.stderr}`,
  );

  const installedPackage = path.join(app, "node_modules/@proofscript-example/host-tools");
  assert.ok(fs.existsSync(path.join(installedPackage, "package.json")));
  assert.ok(fs.existsSync(path.join(installedPackage, "index.cjs")));

  const source = path.join(app, "Main.ps");
  const manifest = path.join(app, "proofscript.ffi.json");
  const dist = path.join(app, "dist");
  const js = path.join(dist, "Main.js");
  const core = path.join(dist, "Main.pscore.json");
  const cert = path.join(dist, "Main.pscert.json");
  fs.mkdirSync(dist, { recursive: true });

  const checked = pscJson(["check", source, "--emit-core", core]);
  assert.equal(checked.status, "accepted");

  const built = pscJson([
    "build-js", source,
    "--out", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(built.status, "accepted");
  assert.equal(built.ffi.bindings[0].module, "@proofscript-example/host-tools");
  assert.equal(built.trustBoundary.trustedExternalCode, true);

  const executed = spawnSync(process.execPath, [
    "-e",
    "const m=require(process.argv[1]); process.stdout.write(String(m.result));",
    js,
  ], {
    cwd: app,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    executed.status,
    0,
    `generated npm FFI program failed\nstdout:\n${executed.stdout}\nstderr:\n${executed.stderr}`,
  );
  assert.equal(executed.stdout, "PROOFSCRIPT");

  const certified = pscJson([
    "certify", source,
    "--core", core,
    "--out", cert,
    "--runtime-artifact", js,
    "--ffi-manifest", manifest,
  ]);
  assert.equal(certified.status, "accepted");

  const verified = pscJson(["verify", cert]);
  assert.equal(verified.status, "accepted");
  assert.equal(verified.ffi.bindings[0].module, "@proofscript-example/host-tools");
  assert.equal(verified.correspondence.endToEndVerifiedJavaScript, false);

  assert.equal(verified.ffi.dependencies.length, 1);
  assert.equal(verified.ffi.dependencies[0].schema, "proofscript.npm-dependency-identity/v1");
  assert.equal(verified.ffi.dependencies[0].package, "@proofscript-example/host-tools");
  assert.equal(verified.ffi.dependencies[0].version, "1.0.0");
  assert.match(verified.ffi.dependencies[0].contentSha256, /^[0-9a-f]{64}$/u);
  assert.ok(verified.ffi.dependencies[0].fileCount >= 2);

  const installedEntry = path.join(installedPackage, "index.cjs");
  const originalInstalledEntry = fs.readFileSync(installedEntry, "utf8");
  fs.writeFileSync(installedEntry, originalInstalledEntry + "\n// tampered after certification\n");
  const tamperedPackage = pscJson(["verify", cert], 1);
  assert.equal(tamperedPackage.status, "rejected");
  assert.match(tamperedPackage.message, /npm FFI dependency identity mismatch/u);
  fs.writeFileSync(installedEntry, originalInstalledEntry);
  assert.equal(pscJson(["verify", cert]).status, "accepted");

  console.log("PRODUCT_V1_FFI_NPM_CONSUMER_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
