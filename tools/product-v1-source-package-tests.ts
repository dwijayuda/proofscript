#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildModuleGraph } from "../packages/project/src/index.ts";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-source-package-"));
const app = path.join(tmp, "source-package-app");
const pkg = path.join(tmp, "source-package-math");

function sha256File(file: string) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function pscJson(args: string[], cwd = root, expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args, "--json"], {
    cwd,
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
  fs.cpSync(path.join(root, "examples/product-v1/source-package-app"), app, { recursive: true });
  fs.cpSync(path.join(root, "examples/product-v1/source-package-math"), pkg, { recursive: true });

  const producerPackage = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
  assert.equal(producerPackage.name, "@proofscript-example/source-math");
  assert.equal(producerPackage.version, "1.0.0");
  assert.equal(producerPackage.proofscript.sourceRoot, "proofscript");
  assert.ok(producerPackage.files.includes("proofscript"));

  const pack = resolveNpmInvocation(["pack", "--dry-run", "--json"]);
  const packed = spawnSync(pack.command, pack.args, {
    cwd: pkg,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    packed.status,
    0,
    `npm pack --dry-run failed\nstdout:\n${packed.stdout}\nstderr:\n${packed.stderr}`,
  );
  const packInfo = JSON.parse(packed.stdout)[0];
  const packedPaths = new Set((packInfo.files ?? []).map((item: any) => item.path));
  assert.ok(packedPaths.has("package.json"));
  assert.ok(packedPaths.has("proofscript/Example/Math.ps"));

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
    `offline source-package install failed\nstdout:\n${installed.stdout}\nstderr:\n${installed.stderr}`,
  );

  const entry = path.join(app, "src", "Main.ps");
  const graph = buildModuleGraph(entry, app);
  assert.equal(graph.entry, "Main");
  assert.deepEqual(graph.modules.map((module) => module.name), ["Example.Math", "Main"]);
  assert.equal(graph.packages.length, 1);
  assert.equal(graph.packages[0].name, "@proofscript-example/source-math");
  assert.equal(graph.packages[0].version, "1.0.0");
  assert.match(graph.packages[0].packageJsonSha256, /^[0-9a-f]{64}$/u);
  assert.ok(graph.packages[0].sourceRoot.includes(path.join("node_modules", "@proofscript-example", "source-math")));
  assert.ok(graph.sourceRoots.includes(graph.packages[0].sourceRoot));

  const dist = path.join(app, "dist");
  fs.mkdirSync(dist, { recursive: true });
  const core = path.join(dist, "Main.pscore.json");
  const checked = pscJson(["check", entry, "--emit-core", core], app);
  assert.equal(checked.status, "accepted");

  const coreArtifact = JSON.parse(fs.readFileSync(core, "utf8"));
  const packageModule = coreArtifact.modules.modules.find((module: any) => module.name === "Example.Math");
  const entryModule = coreArtifact.modules.modules.find((module: any) => module.name === "Main");
  assert.ok(packageModule);
  assert.ok(entryModule);
  assert.equal(entryModule.imports[0].module, "Example.Math");

  const installedPackageSource = path.join(
    app,
    "node_modules",
    "@proofscript-example",
    "source-math",
    "proofscript",
    "Example",
    "Math.ps",
  );
  assert.equal(packageModule.sourceSha256, sha256File(installedPackageSource));
  const originalCoreSha256 = sha256File(core);
  const originalModuleSourceSha256 = packageModule.sourceSha256;

  const originalPackageSource = fs.readFileSync(installedPackageSource, "utf8");
  fs.writeFileSync(installedPackageSource, originalPackageSource + "\n-- source package tamper probe\n");
  const tamperedCore = path.join(dist, "Main.tampered.pscore.json");
  assert.equal(pscJson(["check", entry, "--emit-core", tamperedCore], app).status, "accepted");
  const tamperedArtifact = JSON.parse(fs.readFileSync(tamperedCore, "utf8"));
  const tamperedPackageModule = tamperedArtifact.modules.modules.find((module: any) => module.name === "Example.Math");
  assert.notEqual(tamperedPackageModule.sourceSha256, originalModuleSourceSha256);
  assert.notEqual(sha256File(tamperedCore), originalCoreSha256);
  fs.writeFileSync(installedPackageSource, originalPackageSource);

  const localCollision = path.join(app, "src", "Example", "Math.ps");
  fs.mkdirSync(path.dirname(localCollision), { recursive: true });
  fs.writeFileSync(localCollision, "def localCollision: Nat := { 0 }\n");
  const ambiguous = pscJson(["check", entry], app, 1);
  assert.equal(ambiguous.status, "rejected");
  assert.match(ambiguous.message, /ambiguous module 'Example\.Math' resolves to/u);
  fs.rmSync(path.join(app, "src", "Example"), { recursive: true, force: true });

  const installedPackageJson = path.join(
    app,
    "node_modules",
    "@proofscript-example",
    "source-math",
    "package.json",
  );
  const originalPackageJson = fs.readFileSync(installedPackageJson, "utf8");
  const escapedPackageJson = JSON.parse(originalPackageJson);
  escapedPackageJson.proofscript.sourceRoot = "../";
  fs.writeFileSync(installedPackageJson, JSON.stringify(escapedPackageJson, null, 2) + "\n");
  const escaped = pscJson(["check", entry], app, 1);
  assert.equal(escaped.status, "rejected");
  assert.match(escaped.message, /proofscript\.sourceRoot escapes its package root/u);
  fs.writeFileSync(installedPackageJson, originalPackageJson);

  const restored = pscJson(["check", entry], app);
  assert.equal(restored.status, "accepted");

  console.log("PRODUCT_V1_SOURCE_PACKAGE_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
