#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatProcessProgress, runStreamingProcess } from "./ps3-process-runner.mjs";
import { normalizeLeanToolchainSelector } from "../packages/monadic-lowering/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "tools", "ps3-loop-lean-vc-runner.ts");
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

const toolchainInput = option("--toolchains") ?? "4.33.1,4.34.0";
const toolchains = [...new Set(
  toolchainInput
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeLeanToolchainSelector),
)];
if (toolchains.length === 0) throw new Error("loop proof matrix requires at least one Lean toolchain");

const source = option("--source") ?? "examples/software/09-count-to-loop-vc.ps";
const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-loop-proof-matrix/matrix.json",
);
const evidenceDir = path.resolve(
  process.cwd(),
  option("--evidence-dir") ?? path.join(path.dirname(outPath), "evidence"),
);

const planned = toolchains.map((toolchain) => ({
  name: "count-to",
  source,
  toolchain,
  requireProof: true,
  status: "planned",
}));

if (planOnly) {
  const report = {
    schema: "proofscript.loop-proof-matrix/v1",
    status: "planned",
    executionAttempted: false,
    toolchains,
    cases: planned,
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

fs.mkdirSync(evidenceDir, { recursive: true });
const results = [];

function slug(toolchain: string) {
  return toolchain.replace(/^leanprover\/lean4:/u, "").replace(/[^A-Za-z0-9._-]+/gu, "_");
}

for (const toolchain of toolchains) {
  const reportPath = path.join(evidenceDir, `count-to-${slug(toolchain)}.json`);
  const runnerArgs = [
    "--experimental-strip-types",
    "--disable-warning=ExperimentalWarning",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    runner,
    "--source", source,
    "--lean-toolchain", toolchain,
    "--require-proof",
    "--out", reportPath,
  ];
  for (const flag of ["--lean-project", "--lean-cmd", "--lake-cmd"]) {
    const value = option(flag);
    if (value) runnerArgs.push(flag, value);
  }

  const progressName = `count-to @ ${toolchain}`;
  console.error(formatProcessProgress("start", progressName));
  const run = await runStreamingProcess(process.execPath, runnerArgs, {
    cwd: root,
    streamStdout: false,
    streamStderr: true,
  });
  console.error(formatProcessProgress(
    (run.status ?? 1) === 0 ? "pass" : "fail",
    progressName,
    run.status ?? 1,
  ));

  const evidence = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
    : null;
  const valid = evidence?.schema === "proofscript.loop-vc-run/v1"
    && evidence?.status === "proved"
    && evidence?.claims?.semanticLoopVcGenerationComplete === true
    && evidence?.claims?.leanTypechecked === true
    && evidence?.claims?.semanticProofDischarge === true
    && evidence?.claims?.sourceRuntimeCorrespondenceChecked === false;

  results.push({
    name: "count-to",
    source,
    toolchain,
    requireProof: true,
    processExitCode: run.status ?? 1,
    processError: run.error?.message ?? null,
    signal: run.signal ?? null,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
    reportPath: path.relative(root, reportPath).replace(/\\/gu, "/"),
    evidenceStatus: evidence?.status ?? null,
    failedStage: evidence?.failedStage ?? null,
    observedLeanVersion: evidence?.lean?.version ?? evidence?.lean?.message ?? null,
    provenance: evidence?.provenance ?? null,
    claims: evidence?.claims ?? null,
    status: (run.status ?? 1) === 0 && valid ? "proved" : "failed",
  });
}

const sourceHashes = new Set(results.map((item) => item.provenance?.sourceSha256).filter(Boolean));
const generatedHashes = new Set(results.map((item) => item.provenance?.generatedLeanSha256).filter(Boolean));
const provenanceConsistent = sourceHashes.size === 1
  && generatedHashes.size === 1
  && results.every((item) => item.provenance?.sourceSha256 && item.provenance?.generatedLeanSha256);
const passed = results.every((item) => item.status === "proved") && provenanceConsistent;

const report = {
  schema: "proofscript.loop-proof-matrix/v1",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  toolchains,
  cases: results,
  provenanceValidation: {
    valid: provenanceConsistent,
    sourceSha256: sourceHashes.size === 1 ? [...sourceHashes][0] : null,
    generatedLeanSha256: generatedHashes.size === 1 ? [...generatedHashes][0] : null,
  },
  summary: {
    total: results.length,
    proved: results.filter((item) => item.status === "proved").length,
    failed: results.filter((item) => item.status !== "proved").length,
    allProofsDischarged: results.every((item) => item.status === "proved"),
    provenanceConsistent,
    sourceRuntimeCorrespondenceChecked: false,
  },
};
writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
