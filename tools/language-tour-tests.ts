#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runPsliveJson } from "./pslive-test-harness.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tour = path.join(root, "examples", "language-tour");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-language-tour-"));

function runNode(args: string[], expected = 0) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(
    result.status,
    expected,
    `${args.join(" ")} expected exit ${expected}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return result;
}

function json(result: ReturnType<typeof spawnSync>, label: string) {
  try {
    return JSON.parse(result.stdout || "{}");
  } catch {
    throw new Error(`${label} did not emit JSON\n${result.stdout}\n${result.stderr}`);
  }
}

const executable = [
  ["01-Basics.ps", [["fortyFour", "44"], ["chained", "42"], ["localBlock", "42"]]],
  ["02-Data.ps", [["movedSum", "62"], ["blueCode", "3"], ["someDefault", "7"]]],
  ["03-Collections.ps", [["mappedLength", "3"], ["mappedArraySize", "3"]]],
  ["04-Effects.ps", [["optionValue", "4"], ["exceptValue", "6"]]],
  ["05-Classes.ps", [["natResult", "7"], ["boxResult", "42"]]],
  ["06-Proofs.ps", [["executable", "9"]]],
] as const;

for (const [file, calls] of executable) {
  const source = path.join(tour, file);
  const stem = path.basename(file, ".ps");
  const checked = runPsliveJson(["check", source, "--std", "--json"]);
  assert.equal(checked.status, "accepted", `${file} must check`);

  const jsOut = path.join(tmp, `${stem}.js`);
  const builtJs = runPsliveJson(["build-js", source, "--out", jsOut, "--json"]);
  assert.equal(builtJs.status, "accepted", `${file} JS build`);
  assert.ok(fs.existsSync(jsOut));

  const tsOut = path.join(tmp, `${stem}.ts`);
  const builtTs = runPsliveJson(["build-ts", source, "--out", tsOut, "--json"]);
  assert.equal(builtTs.status, "accepted", `${file} TS build`);
  assert.ok(fs.existsSync(tsOut));

  const compiledDir = path.join(tmp, `${stem}-compiled`);
  fs.mkdirSync(compiledDir, { recursive: true });
  const tsc = path.join(root, "node_modules", "typescript", "lib", "tsc.js");
  runNode([
    tsc, tsOut,
    "--target", "ES2022",
    "--module", "CommonJS",
    "--strict",
    "--skipLibCheck",
    "--outDir", compiledDir,
  ]);

  for (const [name, expected] of calls) {
    const result = runPsliveJson(["run", source, "--call", name, "--json"]);
    assert.equal(result.status, "accepted");
    assert.equal(result.result, expected, `${file}:${name}`);
  }
}

function pscJson(args: string[]) {
  return json(runNode(["bin/psc.mjs", ...args, "--json"]), `psc ${args.join(" ")}`);
}

const pureSource = path.join(tour, "07-Contracts.ps");
const pureContracts = path.join(tmp, "Contracts.contracts.json");
const pure = pscJson(["contracts", pureSource, "--out", pureContracts]);
assert.equal(pure.status, "accepted");
assert.equal(pure.contractKind, "pure");
assert.ok(Array.isArray(pure.obligations) && pure.obligations.length >= 2);

const pureObligations = path.join(tmp, "Contracts.obligations.json");
const normalizedPure = pscJson(["obligations", pureSource, "--out", pureObligations]);
assert.equal(normalizedPure.status, "accepted");
assert.ok(normalizedPure.count >= 2);

const loopSource = path.join(tour, "08-LoopVerification.ps");
const loopContracts = path.join(tmp, "Loop.contracts.json");
const loop = pscJson(["contracts", loopSource, "--out", loopContracts]);
assert.equal(loop.status, "accepted");
assert.ok(Array.isArray(loop.loops) && loop.loops.length === 1);

const statefulSource = path.join(tour, "09-StatefulVerification.ps");
const stateModel = path.join(tour, "09-StatefulVerification.model.json");
const statefulContracts = path.join(tmp, "Stateful.contracts.json");
const stateful = pscJson([
  "contracts", statefulSource,
  "--state-model", stateModel,
  "--out", statefulContracts,
]);
assert.equal(stateful.status, "accepted");
assert.equal(stateful.contractKind, "monadic-stateful");
assert.ok(stateful.stateModel);

const lowering = path.join(tmp, "Stateful.lowering.json");
const lowered = pscJson(["monadic-lowering", statefulContracts, "--out", lowering]);
assert.equal(lowered.status, "accepted");
assert.ok(fs.existsSync(lowering));

console.log("PROOFSCRIPT_LANGUAGE_TOUR=PASS");
