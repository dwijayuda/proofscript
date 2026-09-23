#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";
import { formatProcessProgress, runStreamingProcess } from "./ps3-process-runner.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const planOnly = args.includes("--plan-only");

function option(name: string) {
  const eq = args.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

const toolchainInput = option("--toolchains") ?? "4.33.1,4.34.0,4.35.0-rc2";
const toolchains = toolchainInput.split(",").map((value) => value.trim()).filter(Boolean);
if (toolchains.length === 0) throw new Error("Product v1 verification end-test requires at least one Lean toolchain");

const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-product-v1-verification/summary.json",
);
const outputRoot = path.dirname(outPath);
const loopMatrixPath = path.join(outputRoot, "loop-proof-matrix.json");
const loopEvidenceDir = path.join(outputRoot, "loop-evidence");
const statefulSummaryPath = path.join(outputRoot, "stateful", "summary.json");

function npmArgs(script: string, extra: string[] = []) {
  return ["run", script, ...(extra.length ? ["--", ...extra] : [])];
}

const forwarded: string[] = [];
for (const flag of ["--lean-project", "--lean-cmd", "--lake-cmd"]) {
  const value = option(flag);
  if (value) forwarded.push(flag, value);
}

const steps = [
  { name: "build", args: npmArgs("build") },
  { name: "product-v1-contract", args: npmArgs("test:product-v1:contract") },
  { name: "pure-contracts", args: npmArgs("test:ps3:pure-contracts") },
  { name: "loop-vc", args: npmArgs("test:ps3:loop-vc") },
  { name: "loop-runner-selection", args: npmArgs("test:ps3:loop-lean-runner-selection") },
  { name: "loop-matrix-plan", args: npmArgs("test:ps3:loop-lean-proof-matrix") },
  {
    name: "loop-proof-matrix",
    args: npmArgs("assurance:ps3:loop-lean-proof-matrix", [
      "--toolchains", toolchainInput,
      "--out", loopMatrixPath,
      "--evidence-dir", loopEvidenceDir,
      ...forwarded,
    ]),
  },
  {
    name: "stateful-endtest",
    args: npmArgs("assurance:ps3:stateful-endtest", [
      "--toolchains", toolchainInput,
      "--out", statefulSummaryPath,
      ...forwarded,
    ]),
  },
];

if (planOnly) {
  const report = {
    schema: "proofscript.product-v1-verification-endtest/v1",
    status: "planned",
    executionAttempted: false,
    toolchains,
    output: {
      summary: path.relative(root, outPath).replace(/\\/gu, "/"),
      loopMatrix: path.relative(root, loopMatrixPath).replace(/\\/gu, "/"),
      statefulSummary: path.relative(root, statefulSummaryPath).replace(/\\/gu, "/"),
    },
    steps: steps.map((step) => ({ ...step, status: "planned" })),
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

fs.mkdirSync(outputRoot, { recursive: true });
const results = [];
let previousPassed = true;

for (const step of steps) {
  if (!previousPassed) {
    results.push({
      ...step,
      status: "skipped",
      reason: "previous Product v1 verification gate failed",
      exitCode: null,
      stdout: "",
      stderr: "",
    });
    continue;
  }

  const invocation = resolveNpmInvocation(step.args);
  console.error(formatProcessProgress("start", step.name));
  const run = await runStreamingProcess(invocation.command, invocation.args, {
    cwd: root,
  });
  const exitCode = run.status ?? 1;
  const passed = exitCode === 0;
  console.error(formatProcessProgress(passed ? "pass" : "fail", step.name, exitCode));
  results.push({
    ...step,
    command: invocation.command,
    commandMode: invocation.mode,
    status: passed ? "passed" : "failed",
    exitCode,
    processError: run.error?.message ?? null,
    signal: run.signal ?? null,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  });
  previousPassed = passed;
}

const loopMatrix = fs.existsSync(loopMatrixPath)
  ? JSON.parse(fs.readFileSync(loopMatrixPath, "utf8"))
  : null;
const stateful = fs.existsSync(statefulSummaryPath)
  ? JSON.parse(fs.readFileSync(statefulSummaryPath, "utf8"))
  : null;

const passed = results.length === steps.length
  && results.every((step) => step.status === "passed")
  && loopMatrix?.status === "passed"
  && stateful?.status === "passed";

const report = {
  schema: "proofscript.product-v1-verification-endtest/v1",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  toolchains,
  output: {
    summary: path.relative(root, outPath).replace(/\\/gu, "/"),
    loopMatrix: path.relative(root, loopMatrixPath).replace(/\\/gu, "/"),
    statefulSummary: path.relative(root, statefulSummaryPath).replace(/\\/gu, "/"),
  },
  steps: results,
  loop: loopMatrix
    ? {
        status: loopMatrix.status,
        summary: loopMatrix.summary ?? null,
        provenanceValidation: loopMatrix.provenanceValidation ?? null,
      }
    : null,
  stateful: stateful
    ? {
        status: stateful.status,
        summary: stateful.summary ?? null,
        matrix: stateful.matrix ?? null,
      }
    : null,
  summary: {
    totalSteps: results.length,
    passedSteps: results.filter((step) => step.status === "passed").length,
    failedSteps: results.filter((step) => step.status === "failed").length,
    skippedSteps: results.filter((step) => step.status === "skipped").length,
    loopProofsDischarged: loopMatrix?.summary?.allProofsDischarged === true,
    statefulProofsDischarged: stateful?.summary?.allLeanProofsDischarged === true,
    allStateModelsAdequate: stateful?.summary?.allStateModelsAdequate === true,
    allVerificationProofsDischarged:
      loopMatrix?.summary?.allProofsDischarged === true
      && stateful?.summary?.allLeanProofsDischarged === true,
  },
};

writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
