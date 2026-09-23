#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  leanForMonadicContract,
  makeMonadicContractsArtifact,
} from "../packages/contracts/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";
import {
  createMonadicLeanPreflightArtifact,
  createMonadicLoweringArtifact,
} from "../packages/monadic-lowering/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const specDir = path.join(root, "specs", "verification", "v0.7", "monadic");
const registry = JSON.parse(fs.readFileSync(path.join(specDir, "feature-registry.json"), "utf8"));
const positive = readJsonl(path.join(specDir, "cases", "positive.jsonl"));
const negative = readJsonl(path.join(specDir, "cases", "negative.jsonl"));

assert.equal(registry.profile, "ps3-monadic-contracts0");
assert.equal(registry.claim_ceiling, "specified-structural-alpha");
assert.deepEqual(registry.features.map((feature: any) => feature.id).sort(), ["V-MONADIC-CONTRACT", "V-OLD", "V-RESULT", "V-FRAME"].sort());

for (const item of positive) {
  const stateModel = binding(item.state_model, item.id);
  const built = makeMonadicContractsArtifact({
    sourceText: item.source,
    sourcePath: `<${item.id}>`,
    sourceSha256: "1".repeat(64),
    packageVersion: "test",
    stateModel,
  });
  const { artifact, contract } = built;

  assert.equal(artifact.verification.reference, registry.schema_version, item.id);
  assert.equal(artifact.verification.profile, item.expected.profile, item.id);
  assert.equal(artifact.verification.claim, item.expected.claim, item.id);
  assert.deepEqual(artifact.verification.features, item.expected.features ?? ["V-MONADIC-CONTRACT"], item.id);
  assert.deepEqual(artifact.verification.prototypeFeatures, [], item.id);
  assert.equal(artifact.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(artifact.trustBoundary.semanticProofChecking, false, item.id);
  assert.equal(artifact.trustBoundary.monadicProofDischarge, false, item.id);
  assert.equal(artifact.trustBoundary.vcgenConnected, false, item.id);
  assert.equal(artifact.statefulPostconditionIR.schema, "proofscript.stateful-postcondition-ir/v1", item.id);
  assert.equal(artifact.statefulPostconditionIR.defaultExpressionState, "final-state", item.id);
  assert.equal(artifact.statefulPostconditionIR.predicateNormalizationComplete, true, item.id);
  assert.equal(artifact.statefulPostconditionIR.semanticElaborationComplete, false, item.id);
  assert.equal(artifact.statefulPostconditionIR.binders.entryState.role, "entry-state", item.id);
  assert.equal(artifact.statefulPostconditionIR.binders.result.role, "result", item.id);
  assert.equal(artifact.statefulPostconditionIR.binders.finalState.role, "final-state", item.id);
  const oldReferenceCount = artifact.statefulPostconditionIR.clauses.reduce(
    (count: number, clause: any) => count + clause.oldReferences.length,
    0,
  );
  const resultReferenceCount = artifact.statefulPostconditionIR.clauses.reduce(
    (count: number, clause: any) => count + clause.resultReferences.length,
    0,
  );
  assert.equal(oldReferenceCount, item.expected.old_references ?? 0, item.id);
  assert.equal(resultReferenceCount, item.expected.result_references ?? 0, item.id);
  assert.ok(artifact.statefulPostconditionIR.clauses.every((clause: any) =>
    clause.oldReferences.every((oldRef: any) => oldRef.stateRole === "entry-state")
    && clause.resultReferences.every((resultRef: any) => resultRef.binderRole === "result")
    && clause.finalStateObservationReferences.every((ref: any) => ref.stateRole === "final-state")
  ), item.id);
  assert.equal(artifact.statefulPostconditionIR.observationBindingStatus, "descriptor-bound", item.id);
  assert.ok(artifact.statefulPostconditionIR.modelObservations.some((observation: any) => observation.name === "balanceOf"), item.id);
  assert.equal(artifact.statefulPredicateElaboration.schema, "proofscript.stateful-predicate-elaboration/v1", item.id);
  assert.equal(artifact.statefulPredicateElaboration.scope, "binder-and-state-observation-typing", item.id);
  assert.equal(artifact.statefulPredicateElaboration.binders.entryState.type, "Bank", item.id);
  assert.equal(artifact.statefulPredicateElaboration.binders.result.type, "Unit", item.id);
  assert.equal(artifact.statefulPredicateElaboration.binders.finalState.type, "Bank", item.id);
  assert.equal(artifact.statefulPredicateElaboration.hasTypeErrors, false, item.id);
  assert.equal(artifact.statefulPredicateElaboration.referenceTypingComplete, true, item.id);
  assert.equal(artifact.statefulPredicateElaboration.wholePredicateTypeCheckingComplete, false, item.id);
  assert.equal(artifact.statefulPredicateElaboration.wpTripleSemanticBindingComplete, false, item.id);
  assert.equal(artifact.statefulPredicateElaboration.semanticProofDischarge, false, item.id);
  assert.equal(artifact.statefulPredicateAST.schema, "proofscript.stateful-predicate-ast/v1", item.id);
  assert.equal(artifact.statefulPredicateAST.grammarProfile, "stateful-predicate-expressions0", item.id);
  assert.equal(artifact.statefulPredicateAST.unsupportedSyntax, false, item.id);
  assert.equal(artifact.statefulPredicateAST.hasTypeErrors, false, item.id);
  assert.equal(artifact.statefulPredicateAST.requirementsTypeCheckingComplete, true, item.id);
  assert.equal(artifact.statefulPredicateAST.postconditionsTypeCheckingComplete, true, item.id);
  assert.equal(artifact.statefulPredicateAST.typeCheckingComplete, true, item.id);
  assert.equal(artifact.statefulPredicateAST.requirements.length, contract.requirements.length, item.id);
  assert.ok(artifact.statefulPredicateAST.requirements.every((requirement: any) => requirement.inferredType === "Prop"), item.id);
  assert.ok(artifact.statefulPredicateAST.clauses.every((clause: any) => clause.inferredType === "Prop"), item.id);
  assert.equal(artifact.statefulPredicateAST.wpTripleSemanticBindingComplete, false, item.id);
  assert.equal(artifact.statefulPredicateAST.stateModelAdequacyChecked, false, item.id);
  assert.equal(artifact.statefulPredicateAST.verificationConditionsGenerated, false, item.id);
  assert.equal(artifact.statefulPredicateAST.semanticProofDischarge, false, item.id);
  assert.equal(artifact.statefulOperationElaboration.schema, "proofscript.stateful-operation-elaboration/v1", item.id);
  assert.equal(artifact.statefulOperationElaboration.hasTypeErrors, false, item.id);
  assert.equal(artifact.statefulOperationElaboration.typingComplete, true, item.id);
  assert.equal(artifact.statefulOperationElaboration.operations.length, contract.operations.length, item.id);
  assert.ok(artifact.statefulOperationElaboration.operations.every((operation: any) =>
    operation.typingStatus === "complete"
    && operation.argumentsTyped.every((argument: any) => argument.typeMatches === true)
  ), item.id);
  if (item.expected.final_state_observations !== undefined) {
    const clause = artifact.statefulPostconditionIR.clauses[0];
    assert.equal(clause.finalStateObservationReferences.length, item.expected.final_state_observations, item.id);
    assert.equal(
      clause.oldReferences.reduce((count: number, oldRef: any) => count + oldRef.observationReferences.length, 0),
      item.expected.entry_state_observations,
      item.id,
    );
    if (item.expected.old_references !== undefined) assert.equal(clause.oldReferences.length, item.expected.old_references, item.id);
    if (item.expected.result_references !== undefined) assert.equal(clause.resultReferences.length, item.expected.result_references, item.id);
    assert.ok(clause.finalStateObservationReferences.every((ref: any) => ref.stateRole === "final-state"), item.id);
    assert.ok(clause.oldReferences.every((oldRef: any) => oldRef.observationCoverageComplete === true), item.id);
  }
  if (item.expected.normalized_predicate) {
    assert.equal(artifact.statefulPostconditionIR.clauses[0].normalizedPredicate, item.expected.normalized_predicate, item.id);
  }

  assert.deepEqual(contract.operations.map((op: any) => op.operation), item.expected.operations, item.id);
  assert.equal(contract.obligations.length, item.expected.obligations, item.id);
  assert.ok(contract.obligations.every((obligation: any) => obligation.leanCheckable === false), item.id);

  const lean = leanForMonadicContract(contract);
  const defLine = lean.split(/\r?\n/u).find((line) => line.startsWith("def "));
  assert.ok(defLine, `${item.id}: expected generated program definition`);
  for (const requirement of contract.requirements) {
    assert.ok(!defLine.includes(`(${requirement.name} :`), `${item.id}: requires must not alter program arity`);
  }

  const lowering = createMonadicLoweringArtifact({
    contractArtifact: artifact,
    contractArtifactPath: `<${item.id}.contracts.json>`,
    contractArtifactSha256: "2".repeat(64),
    packageVersion: "test",
  });
  assert.deepEqual(lowering.verification, artifact.verification, item.id);
  assert.deepEqual(lowering.statefulPostconditionIR, artifact.statefulPostconditionIR, item.id);
  assert.deepEqual(lowering.statefulPredicateElaboration, artifact.statefulPredicateElaboration, item.id);
  assert.deepEqual(lowering.statefulPredicateAST, artifact.statefulPredicateAST, item.id);
  assert.deepEqual(lowering.statefulOperationElaboration, artifact.statefulOperationElaboration, item.id);
  assert.equal(lowering.statefulProgramLowering.schema, "proofscript.stateful-program-lowering/v1", item.id);
  assert.equal(lowering.statefulProgramLowering.grammarProfile, "stateful-flat-operation-sequence0", item.id);
  assert.equal(lowering.statefulProgramLowering.programLoweringReady, true, item.id);
  assert.equal(lowering.statefulProgramLowering.leanProgramTypechecked, false, item.id);
  assert.equal(lowering.statefulProgramLowering.sourceToLeanProgramEquivalenceChecked, false, item.id);
  assert.match(lowering.statefulProgramLowering.leanDefinition, /: StateM Bank Unit := do\n/u, item.id);
  assert.equal(lowering.statefulProgramLowering.stateModel.leanMonad, "StateM Bank", item.id);
  assert.equal(lowering.statefulProgramLowering.stateModel.monadMappingComplete, true, item.id);
  assert.equal(lowering.statefulLeanSemanticEncoding.schema, "proofscript.stateful-lean-semantic-encoding/v1", item.id);
  assert.equal(lowering.statefulLeanSemanticEncoding.profile, "std-do-statem-pure-predicate0", item.id);
  assert.equal(lowering.statefulLeanSemanticEncoding.encodingReady, true, item.id);
  assert.equal(lowering.statefulLeanSemanticEncoding.monad.lean, "StateM Bank", item.id);
  assert.match(lowering.statefulLeanSemanticEncoding.precondition.leanSource, /⌜/u, item.id);
  assert.match(lowering.statefulLeanSemanticEncoding.postcondition.leanSource, /^⇓ __ps_result __ps_final => ⌜/u, item.id);
  assert.match(lowering.statefulLeanSemanticEncoding.tripleTarget, /^Std\.Do\.Triple /u, item.id);
  assert.equal(lowering.statefulLeanSemanticEncoding.tripleTargetTypechecked, false, item.id);
  assert.equal(lowering.statefulVcRequest.schema, "proofscript.stateful-vc-request/v1", item.id);
  assert.equal(lowering.statefulVcRequest.requestSourceReady, false, item.id);
  assert.ok(lowering.statefulVcRequest.diagnostics.some((diagnostic: any) =>
    diagnostic.code === "stateful-vc-request-model-imports-unbound"
  ), item.id);
  assert.equal(lowering.statefulVcRequest.request.source, null, item.id);
  assert.equal(lowering.statefulVcRequest.leanEnvironmentResolved, false, item.id);
  assert.equal(lowering.statefulVcRequest.tacticExecuted, false, item.id);
  assert.equal(lowering.statefulVcRequest.realVerificationConditionsGenerated, false, item.id);
  assert.equal(lowering.summary.statefulReferenceTypingComplete, true, item.id);
  assert.equal(lowering.summary.stateOperationTypingComplete, true, item.id);
  assert.equal(lowering.summary.statefulProgramLoweringReady, true, item.id);
  assert.equal(lowering.summary.normalizedPredicateAstTypeCheckingComplete, true, item.id);
  assert.equal(lowering.statefulWpBinding.schema, "proofscript.stateful-wp-binding/v1", item.id);
  assert.equal(lowering.statefulWpBinding.wp.triple, "Std.Do.Triple", item.id);
  assert.equal(lowering.statefulWpBinding.semantics.runner, "runBankState", item.id);
  assert.equal(lowering.statefulWpBinding.semantics.adequacyTheorem, item.expected.model_adequacy_theorem, item.id);
  assert.equal(lowering.statefulWpBinding.operationTripleTheoremIdentitiesBound, true, item.id);
  assert.equal(lowering.statefulWpBinding.operations.length, contract.operations.length, item.id);
  assert.ok(lowering.statefulWpBinding.operations.every((operation: any) =>
    operation.identityBound === true
    && operation.theoremChecked === false
    && typeof operation.tripleTheorem === "string"
    && operation.tripleTheorem.length > 0
  ), item.id);
  assert.equal(lowering.statefulWpBinding.typedRequirementsReady, true, item.id);
  assert.equal(lowering.statefulWpBinding.typedPostconditionsReady, true, item.id);
  assert.equal(lowering.statefulWpBinding.typedPredicateReady, true, item.id);
  assert.equal(lowering.statefulWpBinding.bindingReady, true, item.id);
  assert.equal(lowering.statefulWpBinding.wpTripleIdentityBindingComplete, true, item.id);
  assert.equal(lowering.statefulWpBinding.wpTripleSemanticEquivalenceChecked, false, item.id);
  assert.equal(lowering.statefulWpBinding.stateModelAdequacyChecked, false, item.id);
  assert.equal(lowering.statefulWpBinding.verificationConditionsGenerated, false, item.id);
  assert.equal(lowering.statefulWpBinding.semanticProofDischarge, false, item.id);
  assert.equal(lowering.summary.statefulWpIdentityBindingReady, true, item.id);
  assert.equal(lowering.statefulVcPlan.schema, "proofscript.stateful-vc-plan/v1", item.id);
  assert.equal(lowering.statefulVcPlan.planningReady, true, item.id);
  assert.equal(lowering.statefulVcPlan.summary.operationGoals, contract.operations.length, item.id);
  assert.equal(lowering.statefulVcPlan.summary.postconditionGoals, contract.ensures.length, item.id);
  assert.equal(lowering.statefulVcPlan.summary.programLoweringReady, true, item.id);
  assert.equal(lowering.statefulVcPlan.summary.operationTheoremIdentitiesBound, true, item.id);
  assert.equal(lowering.statefulVcPlan.summary.typedGoalsReady, true, item.id);
  assert.ok(typeof lowering.statefulVcPlan.provenance.programLeanDefinitionSha256 === "string", item.id);
  assert.equal(lowering.statefulVcPlan.summary.sourceObligationsBound, true, item.id);
  assert.ok(lowering.statefulVcPlan.operationGoals.every((goal: any) =>
    goal.theoremIdentityBound === true
    && goal.theoremChecked === false
    && goal.semanticDerivationComplete === false
    && goal.discharged === false
  ), item.id);
  assert.ok(lowering.statefulVcPlan.postconditionGoals.every((goal: any) =>
    goal.inferredType === "Prop"
    && goal.typeCheckingComplete === true
    && goal.semanticDerivationComplete === false
    && goal.discharged === false
  ), item.id);
  assert.equal(lowering.statefulVcPlan.tripleGoal.theoremStatement, lowering.tripleSkeleton.theoremStatement, item.id);
  assert.equal(lowering.statefulVcPlan.semanticVcDerivationComplete, false, item.id);
  assert.equal(lowering.statefulVcPlan.realVerificationConditionsGenerated, false, item.id);
  assert.equal(lowering.statefulVcPlan.vcgenConnected, false, item.id);
  assert.equal(lowering.statefulVcPlan.semanticProofDischarge, false, item.id);
  assert.equal(lowering.summary.statefulVcPlanningReady, true, item.id);
  assert.equal(lowering.summary.semanticVcDerivationComplete, false, item.id);
  assert.equal(lowering.summary.realVerificationConditionsGenerated, false, item.id);
  assert.equal(lowering.summary.wholePredicateTypeCheckingComplete, false, item.id);
  assert.equal(lowering.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(lowering.summary.semanticProofDischarge, false, item.id);
  assert.equal(lowering.tripleSkeleton.leanCheckable, false, item.id);
  assert.equal(lowering.tripleSkeleton.preconditionBody, item.expected.precondition, item.id);
  assert.equal(lowering.tripleSkeleton.entryStateBinder.type, "Bank", item.id);
  assert.equal(`(${lowering.tripleSkeleton.entryStateBinder.name} : ${lowering.tripleSkeleton.entryStateBinder.type})`, item.expected.entry_state_binder, item.id);
  assert.equal(lowering.tripleSkeleton.precondition, item.expected.precondition_function, item.id);
  assert.equal(lowering.statefulWpBinding.precondition.functionSource, lowering.tripleSkeleton.precondition, item.id);
  assert.equal(lowering.tripleSkeleton.postconditionBody, item.expected.postcondition_body, item.id);
  assert.equal(lowering.tripleSkeleton.postcondition, item.expected.postcondition_function, item.id);
  assert.equal(lowering.statefulWpBinding.postcondition.functionSource, lowering.tripleSkeleton.postcondition, item.id);
  assert.ok(lowering.tripleSkeleton.theoremStatement.includes(item.expected.entry_state_binder), item.id);
  assert.ok(lowering.tripleSkeleton.theoremStatement.includes(`(${item.expected.precondition_function})`), item.id);
  assert.ok(lowering.tripleSkeleton.theoremStatement.includes(`(${item.expected.postcondition_function})`), item.id);
  assert.equal(lowering.tripleSkeleton.modelAdequacyTheorem, item.expected.model_adequacy_theorem, item.id);
  assert.equal(lowering.tripleSkeleton.modelAdequacyChecked, false, item.id);
  assert.equal(lowering.trustBoundary.modelAdequacyTheoremBound, true, item.id);
  assert.equal(lowering.trustBoundary.modelAdequacyChecked, false, item.id);
  for (const requirement of contract.requirements) {
    assert.ok(
      !lowering.tripleSkeleton.theoremStatement.includes(`(${requirement.name} : ${requirement.proposition})`),
      `${item.id}: requires belongs in the Hoare precondition, not theorem binders`,
    );
  }
  assert.ok(lowering.operations.every((op: any) => op.stateModelOperation !== null), item.id);

  const preflight = createMonadicLeanPreflightArtifact({
    loweringArtifact: lowering,
    loweringArtifactPath: `<${item.id}.monadic-lowering.json>`,
    loweringArtifactSha256: "3".repeat(64),
    preflightLeanPath: `<${item.id}.preflight.lean>`,
    preflightLeanSha256: "4".repeat(64),
    leanRun: { status: "skipped", reason: "conformance fixture" },
    packageVersion: "test",
  });
  assert.deepEqual(preflight.verification, artifact.verification, item.id);
  assert.deepEqual(preflight.statefulPostconditionIR, artifact.statefulPostconditionIR, item.id);
  assert.deepEqual(preflight.statefulPredicateElaboration, artifact.statefulPredicateElaboration, item.id);
  assert.deepEqual(preflight.statefulPredicateAST, artifact.statefulPredicateAST, item.id);
  assert.deepEqual(preflight.statefulOperationElaboration, artifact.statefulOperationElaboration, item.id);
  assert.deepEqual(preflight.statefulWpBinding, lowering.statefulWpBinding, item.id);
  assert.deepEqual(preflight.statefulProgramLowering, lowering.statefulProgramLowering, item.id);
  assert.deepEqual(preflight.statefulVcPlan, lowering.statefulVcPlan, item.id);
  assert.deepEqual(preflight.statefulLeanSemanticEncoding, lowering.statefulLeanSemanticEncoding, item.id);
  assert.deepEqual(preflight.statefulVcRequest, lowering.statefulVcRequest, item.id);
  assert.equal(preflight.staticChecks.hasStatefulPostconditionIR, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulPredicateElaboration, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulPredicateAST, true, item.id);
  assert.equal(preflight.staticChecks.statefulReferenceTypingComplete, true, item.id);
  assert.equal(preflight.staticChecks.normalizedPredicateAstTypeCheckingComplete, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulOperationElaboration, true, item.id);
  assert.equal(preflight.staticChecks.stateOperationTypingComplete, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulWpBinding, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulProgramLowering, true, item.id);
  assert.equal(preflight.staticChecks.statefulProgramLoweringReady, true, item.id);
  assert.equal(preflight.staticChecks.leanProgramTypechecked, false, item.id);
  assert.equal(preflight.staticChecks.statefulWpIdentityBindingReady, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulVcPlan, true, item.id);
  assert.equal(preflight.staticChecks.statefulVcPlanningReady, true, item.id);
  assert.equal(preflight.staticChecks.hasStatefulLeanSemanticEncoding, true, item.id);
  assert.equal(preflight.staticChecks.statefulLeanSemanticEncodingReady, true, item.id);
  assert.equal(preflight.staticChecks.tripleTargetTypecheckedInLean, false, item.id);
  assert.equal(preflight.staticChecks.hasStatefulVcRequest, true, item.id);
  assert.equal(preflight.staticChecks.statefulVcRequestSourceReady, false, item.id);
  assert.equal(preflight.staticChecks.leanVcEnvironmentResolved, false, item.id);
  assert.equal(preflight.staticChecks.vcgenExecuted, false, item.id);
  assert.equal(preflight.staticChecks.semanticVcDerivationComplete, false, item.id);
  assert.equal(preflight.staticChecks.realVerificationConditionsGenerated, false, item.id);
  assert.equal(preflight.staticChecks.wholePredicateTypeCheckingComplete, false, item.id);
  assert.equal(preflight.staticChecks.statefulPostconditionSemanticElaborationComplete, false, item.id);
  assert.equal(preflight.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(preflight.trustBoundary.stateOperationTypingComplete, true, item.id);
  assert.equal(preflight.trustBoundary.statefulProgramLoweringReady, true, item.id);
  assert.equal(preflight.trustBoundary.sourceToLeanProgramEquivalenceChecked, false, item.id);
  assert.equal(preflight.trustBoundary.leanProgramTypechecked, false, item.id);
  assert.equal(preflight.trustBoundary.wpTripleIdentityBindingComplete, true, item.id);
  assert.equal(preflight.trustBoundary.statefulVcPlanningReady, true, item.id);
  assert.equal(preflight.trustBoundary.statefulLeanSemanticEncodingReady, true, item.id);
  assert.equal(preflight.trustBoundary.tripleTargetTypecheckedInLean, false, item.id);
  assert.equal(preflight.trustBoundary.statefulVcRequestSourceReady, false, item.id);
  assert.equal(preflight.trustBoundary.leanVcEnvironmentResolved, false, item.id);
  assert.equal(preflight.trustBoundary.vcgenExecuted, false, item.id);
  assert.equal(preflight.trustBoundary.semanticVcDerivationComplete, false, item.id);
  assert.equal(preflight.trustBoundary.realVerificationConditionsGenerated, false, item.id);
  assert.equal(preflight.trustBoundary.wpTripleSemanticEquivalenceChecked, false, item.id);
  assert.equal(preflight.trustBoundary.stateModelAdequacyChecked, false, item.id);
  assert.equal(preflight.trustBoundary.preflightOnly, true, item.id);
  assert.equal(preflight.trustBoundary.checkableAsCompleteSemanticProof, false, item.id);
  assert.equal(preflight.summary.semanticProofDischarge, false, item.id);
}

const declaredLeanModel = binding({
  ...positive[0].state_model,
  lean: {
    imports: ["ProofScript.Test.BankStateModel"],
    openNamespaces: ["BankStateModel"],
  },
}, "declared-lean-vc-request");
const declaredLeanBuilt = makeMonadicContractsArtifact({
  sourceText: positive[0].source,
  sourcePath: "<declared-lean-vc-request>",
  sourceSha256: "a".repeat(64),
  packageVersion: "test",
  stateModel: declaredLeanModel,
});
assert.equal(declaredLeanBuilt.artifact.verification.profile, "ps3-monadic-contracts0");
const declaredLeanLowering = createMonadicLoweringArtifact({
  contractArtifact: declaredLeanBuilt.artifact,
  contractArtifactPath: "<declared-lean-vc-request.contracts.json>",
  contractArtifactSha256: "b".repeat(64),
  packageVersion: "test",
});
assert.equal(declaredLeanLowering.statefulVcRequest.requestSourceReady, true);
assert.equal(declaredLeanLowering.statefulVcRequest.environment.bindingsDeclared, true);
assert.equal(declaredLeanLowering.statefulVcRequest.environment.resolvedInLean, false);
assert.equal(declaredLeanLowering.statefulVcRequest.leanEnvironmentResolved, false);
assert.equal(declaredLeanLowering.statefulVcRequest.tacticExecuted, false);
assert.equal(declaredLeanLowering.statefulVcRequest.realVerificationConditionsGenerated, false);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /import Std\.Tactic\.Do/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /import ProofScript\.Test\.BankStateModel/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /open Std\.Do/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /StateM Bank Unit/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /⌜/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /⇓ __ps_result __ps_final => ⌜/u);
assert.match(declaredLeanLowering.statefulVcRequest.request.source, /vcgen \[/u);

for (const item of negative) {
  if (item.expected === "reject") {
    assert.throws(
      () => makeMonadicContractsArtifact({
        sourceText: item.source,
        sourcePath: `<${item.id}>`,
        sourceSha256: "5".repeat(64),
        packageVersion: "test",
        stateModel: item.state_model ? binding(item.state_model, item.id) : undefined,
      }),
      (error: unknown) => error instanceof Error && error.message.includes(item.error),
      item.id,
    );
    continue;
  }

  const stateModel = binding(item.state_model, item.id);
  const { artifact } = makeMonadicContractsArtifact({
    sourceText: item.source,
    sourcePath: `<${item.id}>`,
    sourceSha256: "6".repeat(64),
    packageVersion: "test",
    stateModel,
  });
  assert.equal(artifact.verification.profile, item.expected_profile, item.id);
  assert.equal(artifact.verification.reference, null, item.id);
  assert.equal(artifact.verification.claim, "prototype-only", item.id);
  assert.ok(artifact.verification.prototypeFeatures.includes(item.prototype_feature), item.id);
  assert.equal(artifact.trustBoundary.specifiedStructuralProfile, false, item.id);
  if (item.expected_ir) {
    const ir = artifact.statefulPostconditionIR;
    assert.equal(ir.schema, "proofscript.stateful-postcondition-ir/v1", item.id);
    assert.equal(ir.defaultExpressionState, item.expected_ir.default_expression_state, item.id);
    assert.equal(ir.semanticElaborationComplete, item.expected_ir.semantic_elaboration_complete, item.id);
    const clause = ir.clauses[0];
    assert.equal(clause.oldReferences.length, item.expected_ir.old_references, item.id);
    assert.equal(clause.resultReferences.length, item.expected_ir.result_references, item.id);
    if (item.expected_ir.old_expression) {
      assert.equal(clause.oldReferences[0]?.expression, item.expected_ir.old_expression, item.id);
    }
    if (item.expected_ir.normalized_predicate) {
      assert.equal(clause.normalizedPredicate, item.expected_ir.normalized_predicate, item.id);
    }
    if (item.expected_ir.undeclared_call) {
      assert.ok(clause.oldReferences[0]?.undeclaredCallHeads.includes(item.expected_ir.undeclared_call), item.id);
      assert.equal(clause.oldReferences[0]?.observationCoverageComplete, false, item.id);
    }
    if (item.expected_ir.entry_state_observations !== undefined) {
      const entryRefs = clause.oldReferences.flatMap((oldRef: any) => oldRef.observationReferences ?? []);
      assert.equal(entryRefs.length, item.expected_ir.entry_state_observations, item.id);
      assert.equal(clause.finalStateObservationReferences.length, item.expected_ir.final_state_observations, item.id);
      assert.ok(entryRefs.every((ref: any) => ref.stateRole === "entry-state"), item.id);
      assert.ok(clause.finalStateObservationReferences.every((ref: any) => ref.stateRole === "final-state"), item.id);
      if (item.expected_ir.observation_name) {
        assert.equal(entryRefs[0]?.name, item.expected_ir.observation_name, item.id);
        assert.equal(clause.finalStateObservationReferences[0]?.name, item.expected_ir.observation_name, item.id);
      }
    }
    const lowering = createMonadicLoweringArtifact({
      contractArtifact: artifact,
      contractArtifactPath: `<${item.id}.contracts.json>`,
      contractArtifactSha256: "7".repeat(64),
      packageVersion: "test",
    });
    assert.deepEqual(lowering.statefulPostconditionIR, ir, item.id);
    const preflight = createMonadicLeanPreflightArtifact({
      loweringArtifact: lowering,
      loweringArtifactPath: `<${item.id}.monadic-lowering.json>`,
      loweringArtifactSha256: "8".repeat(64),
      preflightLeanPath: `<${item.id}.preflight.lean>`,
      preflightLeanSha256: "9".repeat(64),
      leanRun: { status: "skipped", reason: "prototype conformance fixture" },
      packageVersion: "test",
    });
    assert.deepEqual(preflight.statefulPostconditionIR, ir, item.id);
    assert.equal(preflight.staticChecks.statefulPostconditionSemanticElaborationComplete, false, item.id);
  }
  if (item.expected_elaboration) {
    const elaboration = artifact.statefulPredicateElaboration;
    assert.equal(elaboration.schema, "proofscript.stateful-predicate-elaboration/v1", item.id);
    assert.equal(elaboration.hasTypeErrors, item.expected_elaboration.has_type_errors, item.id);
    assert.equal(elaboration.referenceTypingComplete, item.expected_elaboration.reference_typing_complete, item.id);
    if (item.expected_elaboration.error_code) {
      assert.ok(elaboration.diagnostics.some((diagnostic: any) => diagnostic.code === item.expected_elaboration.error_code), item.id);
    }
    const lowering = createMonadicLoweringArtifact({
      contractArtifact: artifact,
      contractArtifactPath: `<${item.id}.contracts.json>`,
      contractArtifactSha256: "b".repeat(64),
      packageVersion: "test",
    });
    assert.deepEqual(lowering.statefulPredicateElaboration, elaboration, item.id);
    const preflight = createMonadicLeanPreflightArtifact({
      loweringArtifact: lowering,
      loweringArtifactPath: `<${item.id}.monadic-lowering.json>`,
      loweringArtifactSha256: "c".repeat(64),
      preflightLeanPath: `<${item.id}.preflight.lean>`,
      preflightLeanSha256: "d".repeat(64),
      leanRun: { status: "skipped", reason: "typed elaboration boundary fixture" },
      packageVersion: "test",
    });
    assert.deepEqual(preflight.statefulPredicateElaboration, elaboration, item.id);
  }
  if (item.expected_operation_elaboration) {
    const operationElaboration = artifact.statefulOperationElaboration;
    assert.equal(operationElaboration.schema, "proofscript.stateful-operation-elaboration/v1", item.id);
    assert.equal(operationElaboration.typingComplete, item.expected_operation_elaboration.typing_complete, item.id);
    if (item.expected_operation_elaboration.error_code) {
      assert.ok(
        operationElaboration.diagnostics.some((diagnostic: any) =>
          diagnostic.code === item.expected_operation_elaboration.error_code
        ),
        item.id,
      );
    }
    const lowering = createMonadicLoweringArtifact({
      contractArtifact: artifact,
      contractArtifactPath: `<${item.id}.contracts.json>`,
      contractArtifactSha256: "1".repeat(64),
      packageVersion: "test",
    });
    assert.equal(lowering.statefulProgramLowering.programLoweringReady, false, item.id);
    assert.equal(lowering.statefulVcPlan.planningReady, false, item.id);
  }
  if (item.expected_ast) {
    const ast = artifact.statefulPredicateAST;
    assert.equal(ast.schema, "proofscript.stateful-predicate-ast/v1", item.id);
    assert.equal(ast.unsupportedSyntax, item.expected_ast.unsupported_syntax, item.id);
    assert.equal(ast.typeCheckingComplete, item.expected_ast.type_checking_complete, item.id);
    if (item.expected_ast.error_code) {
      assert.ok(ast.diagnostics.some((diagnostic: any) => diagnostic.code === item.expected_ast.error_code), item.id);
    }
    const lowering = createMonadicLoweringArtifact({
      contractArtifact: artifact,
      contractArtifactPath: `<${item.id}.contracts.json>`,
      contractArtifactSha256: "e".repeat(64),
      packageVersion: "test",
    });
    assert.deepEqual(lowering.statefulPredicateAST, ast, item.id);
    assert.equal(lowering.statefulWpBinding.bindingReady, false, item.id);
    assert.equal(lowering.statefulWpBinding.wpTripleIdentityBindingComplete, false, item.id);
    assert.equal(lowering.statefulVcPlan.planningReady, false, item.id);
    assert.equal(lowering.statefulVcPlan.realVerificationConditionsGenerated, false, item.id);
    const preflight = createMonadicLeanPreflightArtifact({
      loweringArtifact: lowering,
      loweringArtifactPath: `<${item.id}.monadic-lowering.json>`,
      loweringArtifactSha256: "f".repeat(64),
      preflightLeanPath: `<${item.id}.preflight.lean>`,
      preflightLeanSha256: "0".repeat(64),
      leanRun: { status: "skipped", reason: "typed predicate AST boundary fixture" },
      packageVersion: "test",
    });
    assert.deepEqual(preflight.statefulPredicateAST, ast, item.id);
    assert.deepEqual(preflight.statefulWpBinding, lowering.statefulWpBinding, item.id);
    assert.deepEqual(preflight.statefulVcPlan, lowering.statefulVcPlan, item.id);
    assert.equal(preflight.staticChecks.statefulWpIdentityBindingReady, false, item.id);
    assert.equal(preflight.staticChecks.statefulVcPlanningReady, false, item.id);
    assert.equal(preflight.staticChecks.realVerificationConditionsGenerated, false, item.id);
  }
  if (item.missing_operation_triple_theorem) {
    assert.ok(
      artifact.verification.operationsMissingTripleTheorem.includes(item.missing_operation_triple_theorem),
      item.id,
    );
    const lowering = createMonadicLoweringArtifact({
      contractArtifact: artifact,
      contractArtifactPath: `<${item.id}.contracts.json>`,
      contractArtifactSha256: "a".repeat(64),
      packageVersion: "test",
    });
    assert.equal(lowering.statefulWpBinding.operationTripleTheoremIdentitiesBound, false, item.id);
    assert.equal(lowering.statefulWpBinding.bindingReady, false, item.id);
    assert.equal(lowering.statefulVcPlan.planningReady, false, item.id);
    assert.equal(lowering.statefulVcPlan.summary.operationTheoremIdentitiesBound, false, item.id);
  }
  if (item.unknown_operation) {
    assert.ok(artifact.verification.unknownOperations.includes(item.unknown_operation), item.id);
  }
}

const invalidObservationPlacement = JSON.parse(JSON.stringify(positive[0].state_model));
invalidObservationPlacement.observations[0].stateArgument = "first";
assert.throws(
  () => binding(invalidObservationPlacement, "invalid-observation-placement"),
  (error: any) => error instanceof Error
    && error.validation?.errors?.some((item: any) => item.field === "observations[0].stateArgument"),
  "state observations must use the supported last-argument state convention",
);

const duplicateObservation = JSON.parse(JSON.stringify(positive[0].state_model));
duplicateObservation.observations.push({ ...duplicateObservation.observations[0] });
assert.throws(
  () => binding(duplicateObservation, "duplicate-observation"),
  (error: any) => error instanceof Error
    && error.validation?.errors?.some((item: any) => item.field === "observations[1].name"),
  "duplicate state observation names must fail closed",
);

const invalidObservationStateType = JSON.parse(JSON.stringify(positive[0].state_model));
invalidObservationStateType.observations[0].type = "AccountId -> WrongBank -> Nat";
assert.throws(
  () => binding(invalidObservationStateType, "invalid-observation-state-type"),
  (error: any) => error instanceof Error
    && error.validation?.errors?.some((item: any) => item.field === "observations[0].type"),
  "state observation signatures must bind the selected state type as their final input",
);

console.log(JSON.stringify({
  status: "PASS",
  profile: registry.profile,
  features: registry.features.map((feature: any) => feature.id),
  positive: positive.length,
  negative: negative.length,
  claimCeiling: registry.claim_ceiling,
  semanticProofDischarge: false,
}, null, 2));

function binding(descriptor: any, id: string) {
  return buildStateModelBinding(descriptor, {
    descriptorPath: `<${id}.state-model.json>`,
    descriptorSha256: "a".repeat(64),
  });
}

function readJsonl(file: string): any[] {
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
