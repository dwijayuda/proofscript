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
assert.deepEqual(registry.features.map((feature: any) => feature.id), ["V-MONADIC-CONTRACT"]);

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
  assert.deepEqual(artifact.verification.features, ["V-MONADIC-CONTRACT"], item.id);
  assert.deepEqual(artifact.verification.prototypeFeatures, [], item.id);
  assert.equal(artifact.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(artifact.trustBoundary.semanticProofChecking, false, item.id);
  assert.equal(artifact.trustBoundary.monadicProofDischarge, false, item.id);
  assert.equal(artifact.trustBoundary.vcgenConnected, false, item.id);
  assert.equal(artifact.statefulPostconditionIR.schema, "proofscript.stateful-postcondition-ir/v1", item.id);
  assert.equal(artifact.statefulPostconditionIR.defaultExpressionState, "final-state", item.id);
  assert.equal(artifact.statefulPostconditionIR.predicateNormalizationComplete, true, item.id);
  assert.equal(artifact.statefulPostconditionIR.semanticElaborationComplete, false, item.id);
  assert.ok(artifact.statefulPostconditionIR.clauses.every((clause: any) =>
    clause.oldReferences.length === 0 && clause.resultReferences.length === 0
  ), item.id);
  assert.equal(artifact.statefulPostconditionIR.observationBindingStatus, "descriptor-bound", item.id);
  assert.ok(artifact.statefulPostconditionIR.modelObservations.some((observation: any) => observation.name === "balanceOf"), item.id);
  if (item.expected.final_state_observations !== undefined) {
    const clause = artifact.statefulPostconditionIR.clauses[0];
    assert.equal(clause.finalStateObservationReferences.length, item.expected.final_state_observations, item.id);
    assert.equal(
      clause.oldReferences.reduce((count: number, oldRef: any) => count + oldRef.observationReferences.length, 0),
      item.expected.entry_state_observations,
      item.id,
    );
    assert.ok(clause.finalStateObservationReferences.every((ref: any) => ref.stateRole === "final-state"), item.id);
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
  assert.equal(lowering.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(lowering.summary.semanticProofDischarge, false, item.id);
  assert.equal(lowering.tripleSkeleton.leanCheckable, false, item.id);
  assert.equal(lowering.tripleSkeleton.preconditionBody, item.expected.precondition, item.id);
  assert.equal(lowering.tripleSkeleton.entryStateBinder.type, "Bank", item.id);
  assert.equal(`(${lowering.tripleSkeleton.entryStateBinder.name} : ${lowering.tripleSkeleton.entryStateBinder.type})`, item.expected.entry_state_binder, item.id);
  assert.equal(lowering.tripleSkeleton.precondition, item.expected.precondition_function, item.id);
  assert.equal(lowering.tripleSkeleton.postconditionBody, item.expected.postcondition_body, item.id);
  assert.equal(lowering.tripleSkeleton.postcondition, item.expected.postcondition_function, item.id);
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
  assert.equal(preflight.staticChecks.hasStatefulPostconditionIR, true, item.id);
  assert.equal(preflight.staticChecks.statefulPostconditionSemanticElaborationComplete, false, item.id);
  assert.equal(preflight.trustBoundary.specifiedStructuralProfile, true, item.id);
  assert.equal(preflight.trustBoundary.preflightOnly, true, item.id);
  assert.equal(preflight.trustBoundary.checkableAsCompleteSemanticProof, false, item.id);
  assert.equal(preflight.summary.semanticProofDischarge, false, item.id);
}

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
  if (item.unknown_operation) {
    assert.ok(artifact.verification.unknownOperations.includes(item.unknown_operation), item.id);
  }
}

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
