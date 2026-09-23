#!/usr/bin/env node
import fs from "node:fs";
import { formatProcessProgress, runStreamingProcess } from "./ps3-process-runner.mjs";
import path from "node:path";
import {
  normalizeLeanToolchainSelector,
  validateStatefulProofMatrixProvenance,
  validateStatefulVcRunEvidence,
} from "../packages/monadic-lowering/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "tools", "ps3-stateful-lean-vc-runner.ts");
const args = process.argv.slice(2);
const planOnly = args.includes("--plan-only");

function option(name: string) {
  const eq = args.find(arg => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const toolchainInput = option("--toolchains") ?? "4.33.1,4.34.0";
const toolchains = [...new Set(
  toolchainInput
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(normalizeLeanToolchainSelector),
)];
if (toolchains.length === 0) throw new Error("stateful proof matrix requires at least one Lean toolchain");

const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? ".proofscript-stateful-proof-matrix/matrix.json",
);
const evidenceDir = path.resolve(
  process.cwd(),
  option("--evidence-dir") ?? path.join(path.dirname(outPath), "evidence"),
);
const leanProject = option("--lean-project");
const leanCmd = option("--lean-cmd");
const lakeCmd = option("--lake-cmd");

const proofCases = [
  {
    name: "debit",
    source: "examples/software/07-bank-debit-stateful-vc.ps",
    model: "examples/software/06-bank-state.model.json",
  },
  {
    name: "transfer",
    source: "examples/software/06-bank-transfer-monadic-contract.ps",
    model: "examples/software/06-bank-state.model.json",
  },
  {
    name: "frame",
    source: "examples/software/08-bank-debit-frame-stateful-vc.ps",
    model: "examples/software/06-bank-state.model.json",
  },
  {
    name: "logical",
    source: "examples/software/10-bank-audit-logical-stateful-vc.ps",
    model: "examples/software/06-bank-state.model.json",
  },
  {
    name: "invoice",
    source: "examples/product-v1/stateful-invoice/Invoice.ps",
    model: "examples/software/06-bank-state.model.json",
  },
];

function slug(toolchain: string) {
  return toolchain.replace(/^leanprover\/lean4:/u, "").replace(/[^A-Za-z0-9._-]+/gu, "_");
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

const plannedCases = toolchains.flatMap(toolchain =>
  proofCases.map(item => ({
    name: item.name,
    source: item.source,
    model: item.model,
    toolchain,
    requireProof: true,
    status: "planned",
  }))
);

if (planOnly) {
  const report = {
    schema: "proofscript.stateful-proof-matrix/v1",
    status: "planned",
    executionAttempted: false,
    toolchains,
    cases: plannedCases,
  };
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

fs.mkdirSync(evidenceDir, { recursive: true });
const results = [];

for (const toolchain of toolchains) {
  for (const proofCase of proofCases) {
    const reportPath = path.join(
      evidenceDir,
      `${proofCase.name}-${slug(toolchain)}.json`,
    );
    const runnerArgs = [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      runner,
      "--source", proofCase.source,
      "--model", proofCase.model,
      "--require-proof",
      "--lean-toolchain", toolchain,
      "--out", reportPath,
    ];
    if (leanProject) runnerArgs.push("--lean-project", leanProject);
    if (leanCmd) runnerArgs.push("--lean-cmd", leanCmd);
    if (lakeCmd) runnerArgs.push("--lake-cmd", lakeCmd);

    const progressName = `${proofCase.name} @ ${toolchain}`;
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

    let evidence = null;
    let validation = {
      valid: false,
      errors: ["stateful-vc-run-evidence-missing"],
    };
    if (fs.existsSync(reportPath)) {
      evidence = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      validation = validateStatefulVcRunEvidence(evidence, { requireProof: true });
    }

    results.push({
      name: proofCase.name,
      source: proofCase.source,
      model: proofCase.model,
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
      observedLeanVersion: evidence?.lean?.version ?? null,
      observedProjectToolchain: evidence?.lean?.projectToolchain ?? null,
      validation,
      provenance: evidence?.provenance ?? null,
      claims: evidence?.claims ?? null,
      status: (run.status ?? 1) === 0 && validation.valid ? "proved" : "failed",
    });
  }
}

const provenanceValidation = validateStatefulProofMatrixProvenance(results);
const passed = results.every(item => item.status === "proved")
  && provenanceValidation.valid;
const report = {
  schema: "proofscript.stateful-proof-matrix/v1",
  status: passed ? "passed" : "failed",
  executionAttempted: true,
  toolchains,
  cases: results,
  provenanceValidation,
  summary: {
    total: results.length,
    proved: results.filter(item => item.status === "proved").length,
    failed: results.filter(item => item.status !== "proved").length,
    allProofsDischarged: results.every(item => item.status === "proved"),
    allStateModelsAdequate: results.every(
      item => item.claims?.stateModelAdequacyChecked === true,
    ),
    provenanceConsistent: provenanceValidation.valid,
  },
};
writeJson(outPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(passed ? 0 : 1);
