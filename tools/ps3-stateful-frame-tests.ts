#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  makeMonadicContractsArtifact,
} from "../packages/contracts/src/index.mjs";
import { buildStateModelBinding } from "../packages/state-models/src/index.mjs";
import { createMonadicLoweringArtifact } from "../packages/monadic-lowering/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "examples", "software", "08-bank-debit-frame-stateful-vc.ps");
const modelPath = path.join(root, "examples", "software", "06-bank-state.model.json");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const descriptor = JSON.parse(fs.readFileSync(modelPath, "utf8"));
const stateModel = buildStateModelBinding(descriptor, {
  descriptorPath: "examples/software/06-bank-state.model.json",
  descriptorSha256: "a".repeat(64),
});

const { artifact, contract } = makeMonadicContractsArtifact({
  sourceText,
  sourcePath: "examples/software/08-bank-debit-frame-stateful-vc.ps",
  sourceSha256: "b".repeat(64),
  packageVersion: "test",
  stateModel,
});

assert.equal(artifact.verification.profile, "ps3-monadic-contracts0");
assert.ok(artifact.verification.features.includes("V-FRAME"));
assert.equal(contract.frames.length, 1);
assert.equal(contract.frames[0].name, "other_unchanged");
assert.equal(contract.frames[0].kind, "frame");
assert.equal(artifact.frames.length, 1);
assert.equal(artifact.functions[0].frames.length, 1);

const clauses = artifact.statefulPostconditionIR.clauses;
assert.deepEqual(clauses.map((clause) => clause.kind), ["ensures", "frame"]);
const frameIr = clauses[1];
assert.equal(frameIr.name, "other_unchanged");
assert.equal(frameIr.oldReferences.length, 1);
assert.equal(frameIr.oldReferences[0].stateRole, "entry-state");
assert.equal(frameIr.finalStateObservationReferences.length, 1);
assert.equal(frameIr.finalStateObservationReferences[0].stateRole, "final-state");
assert.match(frameIr.normalizedPredicate, /balanceOf\(other, __ps_final\)/u);
assert.match(frameIr.normalizedPredicate, /balanceOf\(other, __ps_entry\)/u);

assert.deepEqual(
  artifact.statefulPredicateElaboration.clauses.map((clause) => clause.kind),
  ["ensures", "frame"],
);
assert.deepEqual(
  artifact.statefulPredicateAST.clauses.map((clause) => clause.kind),
  ["ensures", "frame"],
);
assert.ok(artifact.statefulPredicateAST.clauses.every((clause) =>
  clause.typeCheckingComplete === true && clause.inferredType === "Prop"
));

const frameObligation = contract.obligations.find((obligation) => obligation.kind === "monadic.frame");
assert.ok(frameObligation);
assert.equal(frameObligation.label, "other_unchanged");
assert.match(frameObligation.id, /monadic\.frame/u);

const lowering = createMonadicLoweringArtifact({
  contractArtifact: artifact,
  contractArtifactPath: "<frame.contracts.json>",
  contractArtifactSha256: "c".repeat(64),
  packageVersion: "test",
});

assert.deepEqual(
  lowering.statefulWpBinding.postcondition.clauses.map((clause) => clause.kind),
  ["ensures", "frame"],
);
const frameGoal = lowering.statefulVcPlan.postconditionGoals.find((goal) => goal.clauseKind === "frame");
assert.ok(frameGoal);
assert.equal(frameGoal.kind, "typed-frame-goal");
assert.equal(frameGoal.clause, "other_unchanged");
assert.ok(frameGoal.sourceObligation);
assert.equal(frameGoal.sourceObligation.id, frameObligation.id);
assert.equal(lowering.statefulVcPlan.planningReady, true);
assert.equal(lowering.statefulLeanSemanticEncoding.encodingReady, true);
assert.equal(lowering.statefulVcRequest.requestSourceReady, true);
assert.match(lowering.statefulLeanSemanticEncoding.postcondition.leanSource, /balanceOf/u);
assert.match(lowering.statefulProgramLowering.leanDefinition, /debit/u);
assert.doesNotMatch(lowering.statefulProgramLowering.leanDefinition, /frame/u);

const duplicateLabelSource = sourceText.replace(
  "frame other_unchanged:",
  "frame debit:",
);
assert.throws(
  () => makeMonadicContractsArtifact({
    sourceText: duplicateLabelSource,
    sourcePath: "<duplicate-frame-label>",
    sourceSha256: "d".repeat(64),
    packageVersion: "test",
    stateModel,
  }),
  /duplicate postcondition\/frame name 'debit'/u,
);

const unnamedFrameSource = sourceText.replace(
  "frame other_unchanged:",
  "frame:",
);
assert.throws(
  () => makeMonadicContractsArtifact({
    sourceText: unnamedFrameSource,
    sourcePath: "<unnamed-frame>",
    sourceSha256: "e".repeat(64),
    packageVersion: "test",
    stateModel,
  }),
  /unsupported monadic contract clause/u,
);

console.log("PS3_STATEFUL_FRAME_TESTS=PASS");
