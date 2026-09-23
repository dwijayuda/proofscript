#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const planOnly = args.includes("--plan-only");

function option(name: string) {
  const eq = args.find(arg => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

const toolchainInput = option("--toolchains") ?? "4.33.1,4.34.0";
const toolchains = toolchainInput.split(",").map(value => value.trim()).filter(Boolean);
if (toolchains.length === 0) throw new Error("stateful end test requires at least one Lean toolchain");

const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-stateful-endtest/summary.json",
);
const outputRoot = path.dirname(outPath);
const matrixPath = path.join(outputRoot, "proof-matrix.json");
const evidenceDir = path.join(outputRoot, "evidence");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const matrixArgs = [
  "run", "assurance:ps3:stateful-lean-proof-matrix", "--",
  "--toolchains", toolchainInput,
  "--out", matrixPath,
  "--evidence-dir", evidenceDir,
];
for (const flag of ["--lean-project", "--lean-cmd", "--lake-cmd"]) {
  const value = option(flag);
  if (value) matrixArgs.push(flag, value);
}

const steps = [
  { name: "build", args: ["run", "build"] },
  { name: "lean-version-compatibility", args: ["run", "test:ps3:lean-version-compatibility"] },
  { name: "stateful-model", args: ["run", "test:ps3:stateful-lean-model"] },
  { name: "runner-selection", args: ["run", "test:ps3:stateful-lean-runner-selection"] },
  { name: "proof-matrix-plan", args: ["run", "test:ps3:stateful-lean-proof-matrix"] },
  { name: "vc-evidence", args: ["run", "test:ps3:stateful-vc-evidence"] },
  { name: "vc-run-cli", args: ["run", "test:ps3:stateful-vc-run-cli"] },
  { name: "proof-matrix", args: matrixArgs },
];

if (planOnly) {
  const report = {
    schema: "proofscript.stateful-endtest/v1",
    status: "planned",
    executionAttempted: false,
    toolchains,
    command: npmCommand,
    output: {
      summary: path.relative(root, outPath).replace(/\\/gu, "/"),
      matrix: path.relative(root, matrixPath).replace(/\\/gu, "/"),
      evidenceDir: path.relative(root, evidenceDir).replace(/\\/gu, "/"),
    },
    steps: steps.map(step => ({ ...step, status: "planned" })),
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

fs.mkdirSync(outputRoot, { recursive: true });
const results = [];
let buildPassed = false;
let staticPassed = true;

for (const step of steps) {
  if (step.name === "proof-matrix" && (!buildPassed || !staticPassed)) {
    results.push({
      ...step,
      status: "skipped",
      reason: "stateful static gates did not all pass",
      exitCode: null,
      stdout: "",
      stderr: "",
    });
    continue;
  }
  if (step.name !== "build" && !buildPassed) {
    results.push({
      ...step,
      status: "skipped",
      reason: "build did not pass",
      exitCode: null,
      stdout: "",
      stderr: "",
    });
    if (step.name !== "proof-matrix") staticPassed = false;
    continue;
  }

  const run = spawnSync(npmCommand, step.args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const exitCode = run.status ?? 1;
  const passed = exitCode === 0;
  results.push({
    ...step,
    status: passed ? "passed" : "failed",
    exitCode,
    processError: run.error?.message ?? null,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  });

  if (step.name === "build") {
    buildPassed = passed;
    if (!passed) staticPassed = false;
  } else if (step.name !== "proof-matrix" && !passed) {
    staticPassed = false;
  }
}

const matrixResult = results.find(step => step.name === "proof-matrix");
const passed = buildPassed
  && staticPassed
  && matrixResult?.status === "passed";
let matrixReport = null;
if (fs.existsSync(matrixPath)) {
  matrixReport = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
}

const report = {
  schema: "proofscript.stateful-endtest/v1",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  toolchains,
  output: {
    summary: path.relative(root, outPath).replace(/\\/gu, "/"),
    matrix: path.relative(root, matrixPath).replace(/\\/gu, "/"),
    evidenceDir: path.relative(root, evidenceDir).replace(/\\/gu, "/"),
  },
  steps: results,
  matrix: matrixReport
    ? {
        schema: matrixReport.schema,
        status: matrixReport.status,
        summary: matrixReport.summary ?? null,
      }
    : null,
  summary: {
    totalSteps: results.length,
    passedSteps: results.filter(step => step.status === "passed").length,
    failedSteps: results.filter(step => step.status === "failed").length,
    skippedSteps: results.filter(step => step.status === "skipped").length,
    allStaticGatesPassed: buildPassed && staticPassed,
    allLeanProofsDischarged: matrixReport?.summary?.allProofsDischarged === true,
  },
};

writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
