#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { makeMonadicContractsArtifact } from "../packages/contracts/src/index.mjs";
import {
  classifyLeanCompatibilityOutput,
  createMonadicLoweringArtifact,
} from "../packages/monadic-lowering/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "examples", "software", "07-bank-debit-stateful-vc.ps");
const modelPath = path.join(root, "examples", "software", "06-bank-state.model.json");
const leanProjectRoot = path.join(root, "specs", "verification", "v0.7", "lean");
const leanModelPath = path.join(
  leanProjectRoot,
  "ProofScript",
  "Verification",
  "BankStateModel.lean",
);
const leanToolchainPath = path.join(leanProjectRoot, "lean-toolchain");
const lakefilePath = path.join(leanProjectRoot, "lakefile.lean");
const leanLibraryRootPath = path.join(leanProjectRoot, "ProofScript.lean");

const sourceText = fs.readFileSync(sourcePath, "utf8");
const descriptorText = fs.readFileSync(modelPath, "utf8");
const descriptor = JSON.parse(descriptorText);
const leanModel = fs.readFileSync(leanModelPath, "utf8");
const leanToolchain = fs.readFileSync(leanToolchainPath, "utf8").trim();
const lakefile = fs.readFileSync(lakefilePath, "utf8");
const leanLibraryRoot = fs.readFileSync(leanLibraryRootPath, "utf8");

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

assert.equal(descriptor.lean.imports[0], "ProofScript.Verification.BankStateModel");
assert.deepEqual(descriptor.lean.openNamespaces, ["BankStateModel"]);
assert.equal(descriptor.lean.monadTypeConstructor, "StateM Bank");
assert.equal(descriptor.operations[0].verification.tripleTheorem, "BankStateModel.debit_triple");
assert.match(descriptor.operations[0].spec, /Nat subtraction \(saturating at zero\)/u);

const moduleSourcePath = path.join(
  leanProjectRoot,
  ...descriptor.lean.imports[0].split("."),
) + ".lean";
assert.equal(path.resolve(moduleSourcePath), path.resolve(leanModelPath));
const leanToolchainMatch = leanToolchain.match(/^leanprover\/lean4:v(.+)$/u);
assert.ok(leanToolchainMatch, "verification lean-toolchain must use leanprover/lean4:v<version>");
const defaultLeanCompatibility = classifyLeanCompatibilityOutput(
  `Lean (version ${leanToolchainMatch[1]}, Release)`,
);
assert.equal(defaultLeanCompatibility.status, "accepted");
assert.equal(defaultLeanCompatibility.minimumVersion, "4.33.1");
assert.match(lakefile, /lean_lib ProofScript/u);
assert.match(lakefile, /srcDir := "\."/u);
assert.match(leanLibraryRoot, /import ProofScript\.Verification\.BankStateModel/u);

assert.match(leanModel, /^import Std\.Tactic\.Do/mu);
assert.match(leanModel, /^open Std\.Do/mu);
assert.match(leanModel, /^namespace BankStateModel/mu);
assert.match(leanModel, /abbrev Bank := AccountId → Nat/u);
assert.match(leanModel, /def debit .*: StateM Bank Unit/u);
assert.match(leanModel, /MonadStateOf\.modifyGet fun state => \(\(\), debitState account amount state\)/u);
assert.match(leanModel, /@\[spec\][\s\S]*theorem debit_triple/u);
assert.match(leanModel, /Std\.Do\.Spec\.modifyGet_StateT/u);
assert.match(leanModel, /def runBankState .*:=\s*\n\s*StateT\.run program initial/u);
assert.match(leanModel, /Std\.Do\.StateM\.of_wp_run_eq/u);
assert.match(leanModel, /theorem runBankState_adequate/u);
assert.doesNotMatch(leanModel, /\b(?:sorry|admit)\b/u);

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
const { artifact } = built;

assert.equal(artifact.status, "accepted");
assert.equal(artifact.verification.profile, "ps3-monadic-contracts0");
assert.equal(artifact.statefulPredicateAST.typeCheckingComplete, true);
assert.equal(artifact.statefulOperationElaboration.typingComplete, true);
assert.equal(artifact.statefulOperationElaboration.operations.length, 1);
assert.equal(artifact.statefulOperationElaboration.operations[0].operation, "debit");
assert.equal(artifact.statefulOperationElaboration.operations[0].tripleTheorem, "BankStateModel.debit_triple");

const lowering = createMonadicLoweringArtifact({
  contractArtifact: artifact,
  contractArtifactPath: "dist/07-bank-debit.contracts.json",
  contractArtifactSha256: "b".repeat(64),
  packageVersion: "test",
});

assert.equal(lowering.statefulProgramLowering.programLoweringReady, true);
assert.equal(lowering.statefulProgramLowering.function.leanReturnType, "StateM Bank Unit");
assert.match(lowering.statefulProgramLowering.leanDefinition, /: StateM Bank Unit := do\n  debit from amount/u);
assert.equal(lowering.statefulProgramLowering.leanProgramTypechecked, false);

assert.equal(lowering.statefulWpBinding.bindingReady, true);
assert.equal(lowering.statefulVcPlan.planningReady, true);
assert.equal(lowering.statefulVcPlan.operationGoals.length, 1);
assert.equal(lowering.statefulVcPlan.operationGoals[0].tripleTheorem, "BankStateModel.debit_triple");
assert.equal(lowering.statefulVcPlan.realVerificationConditionsGenerated, false);

const encoding = lowering.statefulLeanSemanticEncoding;
assert.equal(encoding.schema, "proofscript.stateful-lean-semantic-encoding/v1");
assert.equal(encoding.encodingReady, true);
assert.equal(encoding.monad.lean, "StateM Bank");
assert.equal(encoding.precondition.renderedFromTypedAst, true);
assert.equal(encoding.postcondition.renderedFromTypedAst, true);
assert.match(encoding.precondition.leanSource, /⌜__ps_initial = __ps_entry⌝/u);
assert.match(
  encoding.postcondition.leanSource,
  /balanceOf \(from\) \(__ps_final\).*balanceOf \(from\) \(__ps_entry\).* - amount/u,
);
assert.doesNotMatch(encoding.postcondition.leanSource, /balanceOf\s*\(/u);
assert.equal(encoding.tripleTargetTypechecked, false);

const request = lowering.statefulVcRequest;
assert.equal(request.schema, "proofscript.stateful-vc-request/v1");
assert.equal(request.requestSourceReady, true);
assert.equal(request.environment.bindingsDeclared, true);
assert.equal(request.environment.resolvedInLean, false);
assert.equal(request.leanEnvironmentResolved, false);
assert.equal(request.tacticExecuted, false);
assert.equal(request.semanticVcDerivationComplete, false);
assert.equal(request.realVerificationConditionsGenerated, false);
assert.equal(request.semanticProofDischarge, false);
assert.match(request.request.source, /import Std\.Tactic\.Do/u);
assert.match(request.request.source, /import ProofScript\.Verification\.BankStateModel/u);
assert.match(request.request.source, /open BankStateModel/u);
assert.match(request.request.source, /def withdraw .*: StateM Bank Unit := do/u);
assert.match(request.request.source, /vcgen \[BankStateModel\.debit_triple\]/u);
assert.doesNotMatch(request.request.source, /\b(?:sorry|admit)\b/u);
assert.doesNotMatch(request.request.source, /balanceOf\s*\(/u);

console.log("PS3_STATEFUL_LEAN_MODEL_TESTS=PASS");
