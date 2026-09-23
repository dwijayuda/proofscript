#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  makeContractsArtifact,
  createLoopVerificationArtifact,
  parsePureContractSource,
} from "../packages/contracts/src/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "examples", "software", "09-count-to-loop-vc.ps");
const sourceText = fs.readFileSync(sourcePath, "utf8");

const built = makeContractsArtifact({
  sourceText,
  sourcePath: "examples/software/09-count-to-loop-vc.ps",
  sourceSha256: "a".repeat(64),
  packageVersion: "test",
});

assert.equal(built.artifact.verification.profile, "ps3-pure-contracts0");
assert.equal(built.artifact.verification.reference, "0.7.0-alpha.2-draft");
assert.deepEqual(
  built.artifact.verification.features,
  ["V-ENSURES", "V-RESULT", "V-INVARIANT", "V-DECREASES"],
);
assert.equal(built.artifact.verification.prototypeFeatures.length, 0);

const loopVc = built.artifact.loopVerification;
assert.equal(loopVc.schema, "proofscript.loop-vc/v1");
assert.equal(loopVc.profile, "loop-vc0");
assert.equal(loopVc.ready, true);
assert.equal(loopVc.locals.length, 1);
assert.equal(loopVc.locals[0].name, "i");
assert.equal(loopVc.resultExpression, "i");
assert.equal(loopVc.condition.lean, "i < n");
assert.equal(loopVc.invariants.length, 1);
assert.equal(loopVc.invariants[0].lean, "i <= n");
assert.equal(loopVc.decreases.lean, "n - i");
assert.equal(loopVc.assignments.length, 1);
assert.equal(loopVc.assignments[0].target, "i");

assert.equal(loopVc.vcs.length, 4);
assert.deepEqual(loopVc.vcs.map((vc) => vc.kind), [
  "loop.invariant.init",
  "loop.invariant.preserve",
  "loop.decreases",
  "loop.exit",
]);
assert.equal(loopVc.vcs[0].target, "0 <= n");
assert.equal(loopVc.vcs[1].target, "i + 1 <= n");
assert.equal(loopVc.vcs[2].target, "n - (i + 1) < n - i");
assert.equal(loopVc.vcs[3].target, "i = n");
assert.ok(loopVc.vcs.every((vc) => vc.source.includes(":= by\n  omega")));

assert.match(loopVc.lean.source, /^import Lean/mu);
assert.match(loopVc.lean.source, /theorem countTo_loop0_inv_bound_init/u);
assert.match(loopVc.lean.source, /theorem countTo_loop0_inv_bound_preserve/u);
assert.match(loopVc.lean.source, /theorem countTo_loop0_remaining_decreases/u);
assert.match(loopVc.lean.source, /theorem countTo_loop0_done_exit/u);
assert.doesNotMatch(loopVc.lean.source, /sorry|admit/u);

assert.equal(built.artifact.obligations.length, 4);
assert.deepEqual(built.artifact.obligations.map((obligation) => obligation.kind), [
  "loop.invariant.init",
  "loop.invariant.preserve",
  "loop.decreases",
  "ensures",
]);
assert.deepEqual(built.artifact.obligations.map((obligation) => obligation.id), [
  "countTo.loop.invariant.init.0.inv_bound",
  "countTo.loop.invariant.preserve.0.inv_bound",
  "countTo.loop.decreases.0.remaining",
  "countTo.ensures.done",
]);
assert.ok(built.artifact.obligations.every((obligation) =>
  obligation.vcgenLoweringStatus === "semantic-loop-vc-generated"
));
assert.equal(built.artifact.trustBoundary.loopInvariantChecking, "semantic-vc-generated-proof-pending");
assert.equal(built.artifact.trustBoundary.loopSemanticVcGenerationComplete, true);
assert.equal(built.artifact.trustBoundary.loopLeanProofDischarge, false);
assert.equal(built.artifact.trustBoundary.loopSourceRuntimeCorrespondenceChecked, false);

const historical = fs.readFileSync(path.join(root, "examples", "software", "05-loop-invariant-contract.ps"), "utf8");
const historicalBuilt = makeContractsArtifact({
  sourceText: historical,
  sourcePath: "examples/software/05-loop-invariant-contract.ps",
  sourceSha256: "b".repeat(64),
  packageVersion: "test",
});
assert.equal(historicalBuilt.artifact.verification.profile, "ka142-loop-prototype");
assert.equal(historicalBuilt.artifact.verification.claim, "prototype-only");
assert.deepEqual(
  historicalBuilt.artifact.verification.prototypeFeatures,
  ["KA142-INVARIANT", "KA142-DECREASES"],
);
assert.equal(historicalBuilt.artifact.loopVerification.ready, false);
assert.ok(
  historicalBuilt.artifact.loopVerification.reasons.includes("loop-vc-nonlinear-or-unsupported-arithmetic"),
);
assert.equal(
  historicalBuilt.artifact.loopVerification.diagnostic,
  "operator '*' is outside loop-vc0 linear Nat arithmetic",
);
assert.equal(historicalBuilt.artifact.trustBoundary.loopInvariantChecking, "structural-obligations-only");

const missingDecrease = sourceText.replace(
  "    decreases remaining: n - i\n",
  "",
);
const missingContract = parsePureContractSource(missingDecrease, "<missing-decrease>");
const missingArtifact = createLoopVerificationArtifact(missingContract);
assert.equal(missingArtifact.ready, false);
assert.deepEqual(missingArtifact.reasons, ["loop-vc-decreases-required"]);

const badAssignment = sourceText.replace("i := i + 1;", "n := n + 1;");
const badContract = parsePureContractSource(badAssignment, "<bad-assignment>");
const badArtifact = createLoopVerificationArtifact(badContract);
assert.equal(badArtifact.ready, false);
assert.deepEqual(badArtifact.reasons, ["loop-vc-assignment-target"]);

console.log("PS3_LOOP_VC_TESTS=PASS");
