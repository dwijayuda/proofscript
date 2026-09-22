#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeMonadicContractsArtifact } from "../packages/contracts/src/index.mjs";
import { createMonadicLoweringArtifact } from "../packages/monadic-lowering/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";
import { probeLean } from "./lib/lean-toolchain.ts";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const outArg = option("--out");
const leanCmd = option("--lean-cmd") ?? process.env.LEAN ?? "lean";

function option(name: string) {
  const eq = args.find(arg => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sha256(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}

function run(command: string, commandArgs: string[], cwd: string) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    command,
    args: commandArgs,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? null,
  };
}

function writeReport(report: any) {
  if (outArg) {
    const resolved = path.resolve(process.cwd(), outArg);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(report, null, 2) + "\n");
  }
  console.log(JSON.stringify(report, null, 2));
}

function classifyResidualGoals(output: string) {
  const text = String(output);
  const unsolved = /unsolved goals?/iu.test(text);
  const lines = text.split(/\r?\n/u);
  const goalLines = lines
    .map(line => line.trimEnd())
    .filter(line => /(?:^|\s)⊢\s/u.test(line));
  const traceBlocks: string[] = [];
  let current: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (/^case\s+\S+/u.test(line.trim()) || /(?:^|\s)⊢\s/u.test(line)) {
      collecting = true;
    }
    if (collecting) current.push(line);
    if (collecting && line.trim() === "") {
      const block = current.join("\n").trim();
      if (block) traceBlocks.push(block);
      current = [];
      collecting = false;
    }
  }
  const tail = current.join("\n").trim();
  if (tail) traceBlocks.push(tail);
  return {
    detected: unsolved || goalLines.length > 0 || traceBlocks.length > 0,
    unsolvedMarker: unsolved,
    goalLines,
    traceBlocks,
    rawOutputSha256: sha256(text),
  };
}

function firstFailedStage(checks: Record<string, any>, residual: any) {
  if (checks.modelBuild.exitCode !== 0) return "lean-model-build";
  if (checks.programCheck.exitCode !== 0) return "lean-program-typecheck";
  if (checks.tripleCheck.exitCode !== 0) return "lean-triple-target-typecheck";
  if (checks.requestRun.exitCode === 0) return null;
  if (residual.detected) return "vc-residual-goals";
  return "vc-request-execution";
}

function leanPreamble(request: any) {
  return [
    ...request.environment.allImports.map((moduleName: string) => `import ${moduleName}`),
    "",
    ...request.environment.openNamespaces.map((namespaceName: string) => `open ${namespaceName}`),
    "",
  ].join("\n");
}

const leanProbe = probeLean(leanCmd);
if (leanProbe.status !== "accepted") {
  const report = {
    schema: "proofscript.stateful-vc-run/v1",
    status: "unsupported",
    scope: "examples/software/07-bank-debit-stateful-vc.ps",
    lean: leanProbe,
    claims: {
      leanEnvironmentResolved: false,
      leanModelTypechecked: false,
      leanProgramTypechecked: false,
      tripleTargetTypechecked: false,
      tacticExecuted: false,
      semanticVcDerivationComplete: false,
      realVerificationConditionsGenerated: false,
      semanticProofDischarge: false,
    },
  };
  writeReport(report);
  if (strict) process.exit(2);
  process.exit(0);
}

const sourcePath = path.join(root, "examples", "software", "07-bank-debit-stateful-vc.ps");
const modelPath = path.join(root, "examples", "software", "06-bank-state.model.json");
const leanProjectRoot = path.join(root, "specs", "verification", "v0.7", "lean");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const descriptorText = fs.readFileSync(modelPath, "utf8");
const descriptor = JSON.parse(descriptorText);
const stateModel = buildStateModelBinding(descriptor, {
  descriptorPath: "examples/software/06-bank-state.model.json",
  descriptorSha256: sha256(descriptorText),
});
const built = makeMonadicContractsArtifact({
  sourceText,
  sourcePath: "examples/software/07-bank-debit-stateful-vc.ps",
  sourceSha256: sha256(sourceText),
  packageVersion: "test",
  stateModel,
});
assert.equal(built.artifact.verification.profile, "ps3-monadic-contracts0");

const lowering = createMonadicLoweringArtifact({
  contractArtifact: built.artifact,
  contractArtifactPath: "generated/07-bank-debit.contracts.json",
  contractArtifactSha256: "b".repeat(64),
  packageVersion: "test",
});
const request = lowering.statefulVcRequest;
assert.equal(request.requestSourceReady, true);
assert.ok(request.request.source);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-stateful-vc-"));
fs.cpSync(leanProjectRoot, tmp, { recursive: true });

const generatedDir = path.join(tmp, "ProofScript", "Verification");
const requestPath = path.join(generatedDir, "GeneratedBankDebitRequest.lean");
const programCheckPath = path.join(generatedDir, "GeneratedBankDebitProgramCheck.lean");
const tripleCheckPath = path.join(generatedDir, "GeneratedBankDebitTripleCheck.lean");

fs.writeFileSync(requestPath, request.request.source);

const preamble = leanPreamble(request);
fs.writeFileSync(programCheckPath, `${preamble}
namespace ProofScript.Generated.ProgramCheck

${lowering.statefulProgramLowering.leanDefinition}

#check withdraw

end ProofScript.Generated.ProgramCheck
`);

fs.writeFileSync(tripleCheckPath, `${preamble}
namespace ProofScript.Generated.TripleCheck

${lowering.statefulProgramLowering.leanDefinition}

variable ${request.request.binders}

#check (${lowering.statefulLeanSemanticEncoding.tripleTarget})

end ProofScript.Generated.TripleCheck
`);

const leanBinDir = path.dirname(path.resolve(leanCmd));
const localLake = path.join(leanBinDir, process.platform === "win32" ? "lake.exe" : "lake");
const lakeCmd = fs.existsSync(localLake) ? localLake : "lake";

const modelBuild = run(lakeCmd, ["build", "ProofScript.Verification.BankStateModel"], tmp);
const programCheck = modelBuild.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, programCheckPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "model build failed", error: null };
const tripleCheck = programCheck.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, tripleCheckPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "program check failed", error: null };
const requestRun = tripleCheck.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, requestPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "triple target check failed", error: null };

const requestOutput = `${requestRun.stdout}\n${requestRun.stderr}`;
const residual = classifyResidualGoals(requestOutput);
const tacticReached = tripleCheck.exitCode === 0
  && (requestRun.exitCode === 0 || residual.detected);
const semanticVcDerivationComplete = tacticReached;
const realVerificationConditionsGenerated = tacticReached;
const semanticProofDischarge = requestRun.exitCode === 0;

const checks = {
  modelBuild,
  programCheck,
  tripleCheck,
  requestRun,
};
const failedStage = firstFailedStage(checks, residual);

const report = {
  schema: "proofscript.stateful-vc-run/v1",
  status: semanticProofDischarge
    ? "proved"
    : (realVerificationConditionsGenerated ? "vcs-generated" : "failed"),
  scope: "examples/software/07-bank-debit-stateful-vc.ps",
  failedStage,
  lean: leanProbe,
  provenance: {
    sourceSha256: sha256(sourceText),
    stateModelDescriptorSha256: sha256(descriptorText),
    leanModelSha256: sha256(fs.readFileSync(
      path.join(leanProjectRoot, "ProofScript", "Verification", "BankStateModel.lean"),
    )),
    generatedProgramSha256: sha256(lowering.statefulProgramLowering.leanDefinition),
    generatedTripleTargetSha256: sha256(lowering.statefulLeanSemanticEncoding.tripleTarget),
    generatedRequestSha256: sha256(request.request.source),
  },
  checks,
  generated: {
    programLeanDefinition: lowering.statefulProgramLowering.leanDefinition,
    tripleTarget: lowering.statefulLeanSemanticEncoding.tripleTarget,
    requestTheoremName: request.request.theoremName,
    requestTarget: request.request.target,
  },
  residualGoals: residual,
  claims: {
    leanEnvironmentResolved: modelBuild.exitCode === 0,
    leanModelTypechecked: modelBuild.exitCode === 0,
    leanProgramTypechecked: programCheck.exitCode === 0,
    tripleTargetTypechecked: tripleCheck.exitCode === 0,
    tacticExecuted: tacticReached,
    semanticVcDerivationComplete,
    realVerificationConditionsGenerated,
    stateModelAdequacyChecked: false,
    sourceToLeanProgramEquivalenceChecked: false,
    exceptionalPathsCovered: false,
    semanticProofDischarge,
  },
};

writeReport(report);

if (strict && !realVerificationConditionsGenerated) process.exit(1);
