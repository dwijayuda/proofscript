#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeMonadicContractsArtifact } from "../packages/contracts/src/index.mjs";
import {
  analyzeStatefulVcExecution,
  classifyLeanCompatibilityOutput,
  createMonadicLoweringArtifact,
} from "../packages/monadic-lowering/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const outArg = option("--out");
const leanCmd = option("--lean-cmd") ?? process.env.LEAN ?? "lean";
const requestedLakeCmd = option("--lake-cmd") ?? process.env.LAKE;

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

function leanPreamble(request: any) {
  return [
    ...request.environment.allImports.map((moduleName: string) => `import ${moduleName}`),
    "",
    ...request.environment.openNamespaces.map((namespaceName: string) => `open ${namespaceName}`),
    "",
  ].join("\n");
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
const lakeCmd = requestedLakeCmd ?? (fs.existsSync(localLake) ? localLake : "lake");

const leanVersionRun = run(lakeCmd, ["env", "lean", "--version"], tmp);
const leanCompatibility = leanVersionRun.exitCode === 0
  ? classifyLeanCompatibilityOutput(`${leanVersionRun.stdout}\n${leanVersionRun.stderr}`)
  : {
      status: "unsupported",
      minimumVersion: "4.33.1",
      message: leanVersionRun.error || leanVersionRun.stderr || "unable to execute Lean through Lake",
    };

const leanProbe = {
  requestedLeanBinary: leanCmd,
  lakeCommand: lakeCmd,
  run: leanVersionRun,
  ...leanCompatibility,
};

if (leanCompatibility.status !== "accepted") {
  const report = {
    schema: "proofscript.stateful-vc-run/v1",
    status: "unsupported",
    scope: "examples/software/07-bank-debit-stateful-vc.ps",
    failedStage: "setup",
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

const checks = {
  modelBuild,
  programCheck,
  tripleCheck,
  requestRun,
};
const execution = analyzeStatefulVcExecution({
  functionName: lowering.function.name,
  request,
  checks,
});

const report = {
  schema: "proofscript.stateful-vc-run/v1",
  status: execution.status,
  scope: "examples/software/07-bank-debit-stateful-vc.ps",
  failedStage: execution.failedStage,
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
  residualGoals: execution.residualGoals,
  goalArtifact: execution.goalArtifact,
  claims: execution.claims,
};

writeReport(report);

if (strict && !execution.claims.realVerificationConditionsGenerated) process.exit(1);
