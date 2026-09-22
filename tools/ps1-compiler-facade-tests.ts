#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkProjectFile, checkProjectSnapshot, checkSource } from "@proofscript/compiler";

const root = path.resolve(import.meta.dirname, "..");
const fixture = path.join(root, "tests", "conformance", "positive", "k0-basic.ps");
const source = fs.readFileSync(fixture, "utf8");

const checked = checkSource(source);
assert.ok(checked.summary.declarations.length >= 5, "compiler facade should check the K0 source fixture");
assert.equal(
  checked.artifact.declarations.length,
  checked.summary.declarations.length,
  "compiler facade artifact/summary declaration counts should agree",
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-compiler-facade-"));
fs.writeFileSync(path.join(tmp, "package.json"), "{\"private\":true}\n");
const srcDir = path.join(tmp, "src");
fs.mkdirSync(srcDir);
const mainFile = path.join(srcDir, "Main.ps");
fs.writeFileSync(mainFile, "theorem disk(P: Prop, h: P): P := h;\n");
const overlaySource = "theorem overlay(P: Prop, h: P): P := h;\n";
const overlayChecked = checkProjectFile(mainFile, {
  sourceProvider: (filePath) => path.resolve(filePath) === path.resolve(mainFile) ? overlaySource : undefined,
});
const overlayNames = overlayChecked.summary.declarations.map((declaration) => declaration.name);
assert.ok(overlayNames.includes("overlay"), "compiler project check must use the unsaved source overlay");
assert.ok(!overlayNames.includes("disk"), "compiler project check must not typecheck stale on-disk text when an overlay exists");


function makeTwoModuleProject(rootDir: string): { main: string; lib: string } {
  fs.writeFileSync(path.join(rootDir, "package.json"), "{\"private\":true}\n");
  const src = path.join(rootDir, "src");
  fs.mkdirSync(src);
  const lib = path.join(src, "Lib.ps");
  const main = path.join(src, "Main.ps");
  fs.writeFileSync(lib, "theorem libIdentity(P: Prop, h: P): P := h;\n");
  fs.writeFileSync(main, "import Lib;\ntheorem mainIdentity(P: Prop, h: P): P := h;\n");
  return { main, lib };
}

const projectA = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-snapshot-a-"));
const filesA = makeTwoModuleProject(projectA);
const snapshotA1 = checkProjectSnapshot(filesA.main).snapshot;
const snapshotA2 = checkProjectSnapshot(filesA.main).snapshot;
assert.equal(snapshotA1.schema, "proofscript.checked-project/v1");
assert.equal(snapshotA1.modules.length, 2);
assert.equal(snapshotA1.projectSha256, snapshotA2.projectSha256, "checked project snapshot must be deterministic");
assert.deepEqual(
  snapshotA1.modules.map((module) => module.module),
  ["Lib", "Main"],
  "snapshot module order must remain deterministic and dependency-first",
);

const projectB = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-snapshot-b-"));
const filesB = makeTwoModuleProject(projectB);
const snapshotB = checkProjectSnapshot(filesB.main).snapshot;
assert.equal(
  snapshotA1.projectSha256,
  snapshotB.projectSha256,
  "checked project hash must not depend on absolute project path",
);

const libBefore = snapshotA1.modules.find((module) => module.module === "Lib")!;
const overlayLib = "theorem libChanged(P: Prop, h: P): P := h;\n";
const snapshotOverlay = checkProjectSnapshot(filesA.main, {
  sourceProvider: (filePath) => path.resolve(filePath) === path.resolve(filesA.lib) ? overlayLib : undefined,
}).snapshot;
const libAfter = snapshotOverlay.modules.find((module) => module.module === "Lib")!;
assert.notEqual(libBefore.sourceSha256, libAfter.sourceSha256, "source overlay must change source identity");
assert.notEqual(libBefore.checkedSemanticSha256, libAfter.checkedSemanticSha256, "checked semantic identity must follow the overlay");
assert.notEqual(snapshotA1.projectSha256, snapshotOverlay.projectSha256, "project identity must change with checked module semantics");

const cliSource = fs.readFileSync(path.join(root, "packages", "cli", "src", "cli.ts"), "utf8");
assert.doesNotMatch(
  cliSource,
  /from\s+["']@proofscript\/frontend["']/,
  "CLI must not bypass the canonical compiler facade for source/project checking",
);
assert.match(
  cliSource,
  /checkProjectFile[^\n]*@proofscript\/compiler|import\s*\{[^}]*checkProjectFile[^}]*\}\s*from\s*["']@proofscript\/compiler["']/s,
  "CLI must consume checkProjectFile from @proofscript/compiler",
);

const packagedCliCore = fs.readFileSync(path.join(root, "tools", "pslive-core.ts"), "utf8");
assert.doesNotMatch(
  packagedCliCore,
  /packages\/frontend\/dist\/index\.js|@proofscript\/frontend/,
  "packaged psc check/build path must not bypass @proofscript/compiler",
);
assert.match(
  packagedCliCore,
  /packages\/compiler\/dist\/index\.js|@proofscript\/compiler/,
  "packaged psc check/build path must consume the compiler facade",
);

console.log("PS1_COMPILER_FACADE_TESTS=PASS");
