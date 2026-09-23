#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { resolveNpmInvocation } from "./ps3-npm-invocation.mjs";
import { formatProcessProgress, runStreamingProcess } from "./ps3-process-runner.mjs";
import { productV1ClosureSatisfied } from "./product-v1-endtest-status.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const planOnly = args.includes("--plan-only");
const skipLean = args.includes("--skip-lean");

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

function npmArgs(script: string, extra: string[] = []) {
  return ["run", script, ...(extra.length ? ["--", ...extra] : [])];
}

const toolchainInput = option("--toolchains") ?? "4.33.1,4.34.0,4.35.0-rc2";
const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-product-v1-endtest/summary.json",
);
const outputRoot = path.dirname(outPath);
const verificationOut = path.join(outputRoot, "verification", "summary.json");
const forwardedLean: string[] = [];
for (const flag of ["--lean-project", "--lean-cmd", "--lake-cmd"]) {
  const value = option(flag);
  if (value) forwardedLean.push(flag, value);
}

const productSteps = [
  ["build", "build"],
  ["completion-contract", "test:product-v1:contract"],
  ["canonical-cli", "test:product-v1:canonical-cli"],
  ["software-profile", "test:product-v1:software-profile"],
  ["software-profile-consistency", "test:profile:software"],
  ["software-profile-examples", "test:profile:software:examples"],
  ["production-modules", "test:production-p4:modules"],
  ["runtime-profile", "test:product-v1:runtime-profile"],
  ["runtime-certificate", "test:product-v1:runtime-certificate"],
  ["runtime-differential", "test:product-v1:runtime-differential"],
  ["certificate-correspondence", "test:product-v1:certificate-correspondence"],
  ["ffi", "test:product-v1:ffi"],
  ["ffi-npm", "test:product-v1:ffi-npm"],
  ["stdlib-profile", "test:product-v1:stdlib-profile"],
  ["formatter", "test:product-v1:formatter"],
  ["source-package", "test:product-v1:source-package"],
  ["json-validation", "test:product-v1:json-validation"],
  ["language-service", "test:ps1:language-service"],
  ["language-worker", "test:ps1:language-worker"],
  ["lsp-transport", "test:ps1:lsp"],
  ["vscode", "test:product-v1:vscode"],
  ["editor-adapter", "test:product-v1:editor-adapter"],
  ["representative-apps", "test:product-v1:representative-apps"],
  ["fresh-release", "test:product-v1:fresh-release"],
].map(([name, script]) => ({ name, args: npmArgs(script) }));

const verificationStep = {
  name: "proof-required-verification",
  args: npmArgs("assurance:product-v1:verification-endtest", [
    "--toolchains", toolchainInput,
    "--out", verificationOut,
    ...forwardedLean,
  ]),
};

const steps = skipLean ? productSteps : [...productSteps, verificationStep];

if (planOnly) {
  const report = {
    schema: "proofscript.product-v1-endtest/v1",
    status: "planned",
    executionAttempted: false,
    skipLean,
    toolchains: skipLean ? [] : toolchainInput.split(",").map((item) => item.trim()).filter(Boolean),
    output: {
      summary: path.relative(root, outPath).replace(/\\/gu, "/"),
      verification: skipLean ? null : path.relative(root, verificationOut).replace(/\\/gu, "/"),
    },
    steps: steps.map((step) => ({ ...step, status: "planned" })),
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

fs.mkdirSync(outputRoot, { recursive: true });
const results = [];
let canContinue = true;

for (const step of steps) {
  if (!canContinue) {
    results.push({
      ...step,
      status: "skipped",
      reason: "previous Product-v1 gate failed",
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
  canContinue = passed;
}

const verification = !skipLean && fs.existsSync(verificationOut)
  ? JSON.parse(fs.readFileSync(verificationOut, "utf8"))
  : null;
const passed = results.length === steps.length
  && results.every((step) => step.status === "passed")
  && (skipLean || verification?.status === "passed");

const closureSatisfied = productV1ClosureSatisfied({ executionPassed: passed, skipLean });

const report = {
  schema: "proofscript.product-v1-endtest/v1",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  skipLean,
  toolchains: skipLean ? [] : toolchainInput.split(",").map((item) => item.trim()).filter(Boolean),
  output: {
    summary: path.relative(root, outPath).replace(/\\/gu, "/"),
    verification: skipLean ? null : path.relative(root, verificationOut).replace(/\\/gu, "/"),
  },
  steps: results,
  verification: verification ? {
    status: verification.status,
    summary: verification.summary ?? null,
    loop: verification.loop ?? null,
    stateful: verification.stateful ?? null,
  } : null,
  summary: {
    totalSteps: results.length,
    passedSteps: results.filter((step) => step.status === "passed").length,
    failedSteps: results.filter((step) => step.status === "failed").length,
    skippedSteps: results.filter((step) => step.status === "skipped").length,
    nonLeanProductGatesPassed: results
      .filter((step) => step.name !== "proof-required-verification")
      .every((step) => step.status === "passed"),
    verificationPassed: skipLean ? null : verification?.status === "passed",
    allProductV1GatesPassed: closureSatisfied,
  },
};

writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
