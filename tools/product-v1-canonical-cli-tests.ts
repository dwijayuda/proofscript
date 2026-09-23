#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

console.log("PRODUCT_V1_CANONICAL_CLI=PASS");
