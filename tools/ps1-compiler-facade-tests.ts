#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkSource } from "@proofscript/compiler";

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

console.log("PS1_COMPILER_FACADE_TESTS=PASS");
