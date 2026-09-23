#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const psc = fs.readFileSync(path.join(root, "bin", "psc.mjs"), "utf8");
const psliveCore = fs.readFileSync(path.join(root, "tools", "pslive-core.ts"), "utf8");
const compiler = fs.readFileSync(path.join(root, "packages", "compiler", "src", "index.ts"), "utf8");

const compilerLibsMatch = psc.match(/function compilerLibs\(\) \{[\s\S]*?\n\}/u);
assert.ok(compilerLibsMatch, "public psc compilerLibs helper must exist");
assert.match(compilerLibsMatch[0], /require\('@proofscript\/compiler'\)/u);
assert.doesNotMatch(compilerLibsMatch[0], /require\('@proofscript\/frontend'\)/u);

const checkedProgramMatch = psc.match(/function checkedProgram\(file\) \{[\s\S]*?\n\}/u);
assert.ok(checkedProgramMatch, "public psc checkedProgram helper must exist");
assert.match(checkedProgramMatch[0], /compiler\.checkProjectFile\(file, \{ prelude \}\)/u);
assert.doesNotMatch(checkedProgramMatch[0], /frontend\.checkProjectFile/u);

assert.match(psliveCore, /packages\/compiler\/dist\/index\.js/u);
assert.match(psliveCore, /checkProjectFile\(file, \{ prelude \}\)/u);
assert.doesNotMatch(psliveCore, /packages\/frontend\/dist\/index\.js/u);

assert.match(compiler, /checkProjectFile as checkProjectFileFrontend/u);
assert.match(compiler, /export function checkProjectFile/u);

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-product-v1-canonical-cli-"));
try {
  const source = path.join(fixtureDir, "Run.ps");
  fs.writeFileSync(source, "def answer: Nat := { 40 + 2 }\n");
  const run = spawnSync(process.execPath, [
    path.join(root, "bin", "psc.mjs"),
    "run",
    source,
    "--call",
    "answer",
    "--json",
  ], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    run.status,
    0,
    `canonical psc run must execute a checked source value\nSTDOUT:\n${run.stdout ?? ""}\nSTDERR:\n${run.stderr ?? ""}`,
  );
  const parsed = JSON.parse(run.stdout);
  assert.equal(parsed.status, "accepted");
  assert.equal(parsed.call, "answer");
  assert.equal(parsed.result, "42");
} finally {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("PRODUCT_V1_CANONICAL_CLI=PASS");
