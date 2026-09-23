#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);

function option(name: string) {
  const eq = args.find((arg) => arg.startsWith(name + "="));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function runNode(file: string) {
  return spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    file,
  ], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function runPsc(args: string[], cwd = root) {
  return spawnSync(process.execPath, [path.join(root, "bin", "psc.mjs"), ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

const selected = [
  { id: "string", file: "tools/pslive-string-tests.ts", marker: "PSLIVE_STRING=PASS", observations: ["String"] },
  { id: "int", file: "tools/pslive-int-arith-tests.ts", marker: "PSLIVE_INT_ARITH=PASS", observations: ["Int", "Bool"] },
  { id: "option-except", file: "tools/pslive-option-except-predicates-tests.ts", marker: "PSLIVE_OPTION_EXCEPT_PREDICATES=PASS", observations: ["Option", "Except", "Bool"] },
  { id: "list", file: "tools/pslive-list-tests.ts", marker: "PSLIVE_LIST=PASS", observations: ["List", "Nat"] },
  { id: "array", file: "tools/pslive-array-access-tests.ts", marker: "PSLIVE_ARRAY_ACCESS=PASS", observations: ["Array", "Option", "Nat"] },
  { id: "structure", file: "tools/structure-match-runtime-tests.ts", marker: "STRUCTURE_MATCH_RUNTIME=PASS", observations: ["Structure", "Nat"] },
  { id: "inductive", file: "tools/user-inductive-match-runtime-tests.ts", marker: "USER_INDUCTIVE_MATCH_RUNTIME=PASS", observations: ["Inductive", "Nat"] },
];

const cases: any[] = [];
let failed = false;

for (const item of selected) {
  const absolute = path.join(root, item.file);
  const source = fs.readFileSync(absolute, "utf8");
  assert.match(source, /theorem\s/u, `${item.file} must contain a kernel-checked theorem witness`);
  assert.ok(
    /buildJsFixture|build-js/u.test(source),
    `${item.file} must execute an emitted JavaScript path`,
  );
  const run = runNode(absolute);
  const passed = run.status === 0 && run.stdout.includes(item.marker);
  failed ||= !passed;
  cases.push({
    id: item.id,
    file: item.file,
    observations: item.observations,
    logicalWitness: "kernel-checked by-rfl theorem(s) in fixture",
    runtimeWitness: "emitted JavaScript execution assertions; selected fixtures also compile emitted TypeScript where applicable",
    status: passed ? "passed" : "failed",
    exitCode: run.status ?? 1,
    marker: item.marker,
    stdoutTail: run.stdout.slice(-2000),
    stderrTail: run.stderr.slice(-2000),
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-runtime-diff-core-"));
try {
  const source = path.join(tmp, "CoreRepresentations.ps");
  fs.writeFileSync(source, [
    "def natObs: Nat := { 20 + 22 }",
    "def boolObs: Bool := { Bool.not(false) }",
    "def unitObs: Unit := { Unit.unit }",
    "theorem nat_obs_rfl: natObs = 42 := by rfl",
    "theorem bool_obs_rfl: boolObs = true := by rfl",
    "theorem unit_obs_rfl: unitObs = Unit.unit := by rfl",
    "",
  ].join("\n"));

  const check = runPsc(["check", source, "--json"]);
  const runs = [
    ["natObs", "42"],
    ["boolObs", "true"],
    ["unitObs", "null"],
  ].map(([name, expected]) => {
    const result = runPsc(["run", source, "--call", name, "--json"]);
    let parsed: any = null;
    try { parsed = JSON.parse(result.stdout); } catch {}
    return { name, expected, result, parsed };
  });
  const passed = check.status === 0
    && runs.every(({ result, parsed, expected }) =>
      result.status === 0 && parsed?.status === "accepted" && parsed?.result === expected
    );
  failed ||= !passed;
  cases.unshift({
    id: "core-representations",
    file: "<generated>",
    observations: ["Nat", "Bool", "Unit"],
    logicalWitness: "three kernel-checked by-rfl theorems",
    runtimeWitness: "psc run executes generated JavaScript and compares observable results",
    status: passed ? "passed" : "failed",
    exitCode: passed ? 0 : 1,
    details: runs.map(({ name, expected, parsed }) => ({ name, expected, actual: parsed?.result ?? null })),
    stderrTail: [check.stderr, ...runs.map((item) => item.result.stderr)].join("\n").slice(-3000),
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const profile = JSON.parse(fs.readFileSync(
  path.join(root, "config", "proofscript-runtime-profile-v1.json"),
  "utf8",
));
const covered = [...new Set(cases.flatMap((item) => item.observations))].sort();
const requiredImplemented = Object.entries(profile.representations)
  .filter(([, value]: any) => String(value.status).startsWith("implemented"))
  .map(([name]) => name)
  .filter((name) => !["Function", "PropAndProofs"].includes(name))
  .sort();

const missingCoverage = requiredImplemented.filter((name) => !covered.includes(name));
if (missingCoverage.length > 0) failed = true;

const report = {
  schema: "proofscript.runtime-differential/v1",
  profileId: profile.profileId,
  status: failed ? "failed" : "passed",
  executionAttempted: true,
  method: "kernel-checked closed observations are paired with emitted JS/compiled-TS runtime observations",
  claimBoundary: {
    runtimeCorrespondenceTestedForCorpus: !failed,
    runtimeCorrespondenceFormallyProved: false,
    coreToTypeScriptFormallyProved: false,
    endToEndVerifiedJavaScript: false,
  },
  coverage: {
    observations: covered,
    requiredImplementedRepresentations: requiredImplemented,
    missingImplementedRepresentationCoverage: missingCoverage,
  },
  cases,
};

const out = option("--out");
if (out) {
  const resolved = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
if (failed) process.exit(1);
