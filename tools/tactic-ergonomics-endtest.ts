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

function npmArgs(script: string) {
  return ["run", script];
}

const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-tactic-ergonomics/summary.json",
);

const steps = [
  { name: "build", args: npmArgs("build") },
  { name: "parser-proof", args: npmArgs("test:parser:proof") },
  { name: "elaborator-proof", args: npmArgs("test:elaborator:proof-extraction") },
  { name: "language-service", args: npmArgs("test:ps1:language-service") },
  { name: "language-worker", args: npmArgs("test:ps1:language-worker") },
  { name: "lsp-transport", args: npmArgs("test:ps1:lsp") },
  { name: "vscode-smoke", args: npmArgs("test:product-v1:vscode") },
  { name: "standalone-small", args: npmArgs("test:standalone-small") },
  { name: "reference-governance", args: npmArgs("test:reference-governance") },
];

if (planOnly) {
  const report = {
    schema: "proofscript.tactic-ergonomics-endtest/v2",
    status: "planned",
    executionAttempted: false,
    steps: steps.map((step) => ({ ...step, status: "planned" })),
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const results: Array<Record<string, unknown>> = [];
let buildPassed = true;

for (const step of steps) {
  if (step.name !== "build" && !buildPassed) {
    results.push({
      ...step,
      status: "skipped",
      reason: "build failed; downstream tactic results would be noise",
      exitCode: null,
      stdout: "",
      stderr: "",
    });
    continue;
  }

  const invocation = resolveNpmInvocation(step.args);
  console.error(formatProcessProgress("start", step.name));
  const run = await runStreamingProcess(invocation.command, invocation.args, { cwd: root });
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
  if (step.name === "build") buildPassed = passed;
}

const passedSteps = results.filter((step) => step.status === "passed").length;
const failedSteps = results.filter((step) => step.status === "failed").length;
const skippedSteps = results.filter((step) => step.status === "skipped").length;
const passed = failedSteps === 0 && skippedSteps === 0 && passedSteps === steps.length;

const report = {
  schema: "proofscript.tactic-ergonomics-endtest/v2",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  summary: {
    totalSteps: steps.length,
    passedSteps,
    failedSteps,
    skippedSteps,
    allTacticErgonomicsGatesPassed: passed,
  },
  steps: results,
};

writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
