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
  assertStatefulVcRunEvidence,
  classifyLeanCompatibilityOutput,
  createMonadicLoweringArtifact,
  normalizeLeanToolchainSelector,
} from "../packages/monadic-lowering/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const requireProof = args.includes("--require-proof");
const outArg = option("--out");
const sourceArg = option("--source");
const modelArg = option("--model");
const leanProjectArg = option("--lean-project");
const leanCmd = option("--lean-cmd") ?? process.env.LEAN ?? "lean";
const requestedLakeCmd = option("--lake-cmd") ?? process.env.LAKE;
const requestedLeanToolchain = option("--lean-toolchain") ?? process.env.PROOFSCRIPT_LEAN_TOOLCHAIN;
const selectedLeanToolchain = requestedLeanToolchain
  ? normalizeLeanToolchainSelector(requestedLeanToolchain)
  : null;

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

const sourcePath = sourceArg
  ? path.resolve(process.cwd(), sourceArg)
  : path.join(root, "examples", "software", "07-bank-debit-stateful-vc.ps");
const modelPath = modelArg
  ? path.resolve(process.cwd(), modelArg)
  : path.join(root, "examples", "software", "06-bank-state.model.json");
const leanProjectRoot = leanProjectArg
  ? path.resolve(process.cwd(), leanProjectArg)
  : path.join(root, "specs", "verification", "v0.7", "lean");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const descriptorText = fs.readFileSync(modelPath, "utf8");
const sourceScope = path.relative(root, sourcePath).replace(/\\/g, "/");
const modelScope = path.relative(root, modelPath).replace(/\\/g, "/");
const descriptor = JSON.parse(descriptorText);
const modelModule = descriptor.lean?.imports?.[0];
assert.equal(typeof modelModule, "string", "state model must declare at least one Lean import");
assert.ok(modelModule.length > 0, "state model Lean import must be non-empty");
const modelModulePath = path.join(leanProjectRoot, ...modelModule.split(".")) + ".lean";
assert.ok(fs.existsSync(modelModulePath), `declared Lean model module not found: ${modelModulePath}`);
const stateModel = buildStateModelBinding(descriptor, {
  descriptorPath: modelScope,
  descriptorSha256: sha256(descriptorText),
});
const built = makeMonadicContractsArtifact({
  sourceText,
  sourcePath: sourceScope,
  sourceSha256: sha256(sourceText),
  packageVersion: "test",
  stateModel,
});
assert.equal(built.artifact.verification.profile, "ps3-monadic-contracts0");

const lowering = createMonadicLoweringArtifact({
  contractArtifact: built.artifact,
  contractArtifactPath: `generated/${path.basename(sourcePath, path.extname(sourcePath))}.contracts.json`,
  contractArtifactSha256: "b".repeat(64),
  packageVersion: "test",
});
const request = lowering.statefulVcRequest;
const adequacy = lowering.statefulAdequacyCheck;
assert.equal(request.requestSourceReady, true);
assert.ok(request.request.source);
assert.equal(adequacy?.schema, "proofscript.stateful-adequacy-check/v1");
assert.equal(adequacy.ready, true);
assert.ok(adequacy.check?.source);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-stateful-vc-"));
fs.cpSync(leanProjectRoot, tmp, { recursive: true });
const tempToolchainPath = path.join(tmp, "lean-toolchain");
if (selectedLeanToolchain) {
  fs.writeFileSync(tempToolchainPath, selectedLeanToolchain + "\n");
}
const projectToolchain = fs.existsSync(tempToolchainPath)
  ? fs.readFileSync(tempToolchainPath, "utf8").trim()
  : null;

const generatedDir = path.join(tmp, "ProofScript", "Verification");
const generatedStem = lowering.function.name.replace(/[^A-Za-z0-9_]+/g, "_");
const requestPath = path.join(generatedDir, `Generated_${generatedStem}_Request.lean`);
const adequacyCheckPath = path.join(generatedDir, `Generated_${generatedStem}_AdequacyCheck.lean`);
const programCheckPath = path.join(generatedDir, `Generated_${generatedStem}_ProgramCheck.lean`);
const tripleCheckPath = path.join(generatedDir, `Generated_${generatedStem}_TripleCheck.lean`);

fs.writeFileSync(requestPath, request.request.source);
fs.writeFileSync(adequacyCheckPath, adequacy.check.source);

const preamble = leanPreamble(request);
fs.writeFileSync(programCheckPath, `${preamble}
namespace ProofScript.Generated.ProgramCheck

${lowering.statefulProgramLowering.leanDefinition}

#check ${lowering.function.name}

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

console.error(`[proofscript] LEAN  probe ${projectToolchain ?? "<project-default>"}`);
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
  requestedToolchain: selectedLeanToolchain,
  projectToolchain,
  lakeCommand: lakeCmd,
  run: leanVersionRun,
  ...leanCompatibility,
};

if (leanCompatibility.status !== "accepted") {
  const report = {
    schema: "proofscript.stateful-vc-run/v1",
    status: "unsupported",
    scope: sourceScope,
    failedStage: "setup",
    lean: leanProbe,
    claims: {
      leanEnvironmentResolved: false,
      leanModelTypechecked: false,
      stateModelAdequacyChecked: false,
      leanProgramTypechecked: false,
      tripleTargetTypechecked: false,
      tacticExecuted: false,
      semanticVcDerivationComplete: false,
      realVerificationConditionsGenerated: false,
      semanticProofDischarge: false,
    },
  };
  assertStatefulVcRunEvidence(report);
  writeReport(report);
  if (strict || requireProof) process.exit(2);
  process.exit(0);
}

console.error(`[proofscript] LEAN  model-build ${modelModule}`);
const modelBuild = run(lakeCmd, ["build", modelModule], tmp);
if (modelBuild.exitCode === 0) console.error("[proofscript] LEAN  adequacy-check");
const adequacyCheck = modelBuild.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, adequacyCheckPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "model build failed", error: null };
if (adequacyCheck.exitCode === 0) console.error("[proofscript] LEAN  program-typecheck");
const programCheck = adequacyCheck.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, programCheckPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "adequacy check failed", error: null };
if (programCheck.exitCode === 0) console.error("[proofscript] LEAN  triple-typecheck");
const tripleCheck = programCheck.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, tripleCheckPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "program check failed", error: null };
if (tripleCheck.exitCode === 0) console.error("[proofscript] LEAN  proof-request");
const requestRun = tripleCheck.exitCode === 0
  ? run(lakeCmd, ["env", "lean", path.relative(tmp, requestPath)], tmp)
  : { command: lakeCmd, args: [], exitCode: 1, stdout: "", stderr: "triple target check failed", error: null };

const checks = {
  modelBuild,
  adequacyCheck,
  programCheck,
  tripleCheck,
  requestRun,
};
console.error("[proofscript] LEAN  analyze-evidence");
const execution = analyzeStatefulVcExecution({
  functionName: lowering.function.name,
  request,
  checks,
});

const report = {
  schema: "proofscript.stateful-vc-run/v1",
  status: execution.status,
  scope: sourceScope,
  failedStage: execution.failedStage,
  lean: leanProbe,
  provenance: {
    sourceSha256: sha256(sourceText),
    stateModelDescriptorSha256: sha256(descriptorText),
    leanModelModule: modelModule,
    leanModelSha256: sha256(fs.readFileSync(modelModulePath)),
    generatedAdequacyCheckSha256: sha256(adequacy.check.source),
    generatedProgramSha256: sha256(lowering.statefulProgramLowering.leanDefinition),
    generatedTripleTargetSha256: sha256(lowering.statefulLeanSemanticEncoding.tripleTarget),
    generatedRequestSha256: sha256(request.request.source),
  },
  checks,
  generated: {
    adequacyCheckTheoremName: adequacy.check.theoremName,
    adequacyCheckSource: adequacy.check.source,
    programLeanDefinition: lowering.statefulProgramLowering.leanDefinition,
    tripleTarget: lowering.statefulLeanSemanticEncoding.tripleTarget,
    requestTheoremName: request.request.theoremName,
    requestTarget: request.request.target,
  },
  residualGoals: execution.residualGoals,
  goalArtifact: execution.goalArtifact,
  claims: execution.claims,
};

assertStatefulVcRunEvidence(report);
writeReport(report);

if (requireProof && !execution.claims.semanticProofDischarge) process.exit(1);
if (strict && !execution.claims.realVerificationConditionsGenerated) process.exit(1);
