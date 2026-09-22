#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  analyzeStatefulVcExecution,
  classifyLeanResidualGoals,
} from "../packages/monadic-lowering/src/index.mjs";

const request = {
  schema: "proofscript.stateful-vc-request/v1",
  request: {
    theoremName: "withdraw_vc_request",
    target: "Std.Do.Triple (withdraw from amount) P Q",
  },
  tactic: {
    name: "vcgen",
  },
};

function result(exitCode: number, stdout = "", stderr = "") {
  return { exitCode, stdout, stderr };
}

function analyze(checks: any) {
  return analyzeStatefulVcExecution({
    functionName: "withdraw",
    request,
    checks,
  });
}

const modelFailure = analyze({
  modelBuild: result(1, "", "model error"),
  programCheck: result(1),
  tripleCheck: result(1),
  requestRun: result(1),
});
assert.equal(modelFailure.status, "failed");
assert.equal(modelFailure.failedStage, "lean-model-build");
assert.equal(modelFailure.claims.leanEnvironmentResolved, false);
assert.equal(modelFailure.claims.leanModelTypechecked, false);
assert.equal(modelFailure.claims.tacticExecuted, false);
assert.equal(modelFailure.claims.realVerificationConditionsGenerated, false);
assert.equal(modelFailure.claims.semanticProofDischarge, false);
assert.equal(modelFailure.goalArtifact.generatedFromLeanExecution, false);

const programFailure = analyze({
  modelBuild: result(0),
  programCheck: result(1, "", "program type error"),
  tripleCheck: result(1),
  requestRun: result(1),
});
assert.equal(programFailure.failedStage, "lean-program-typecheck");
assert.equal(programFailure.claims.leanEnvironmentResolved, true);
assert.equal(programFailure.claims.leanModelTypechecked, true);
assert.equal(programFailure.claims.leanProgramTypechecked, false);
assert.equal(programFailure.claims.tripleTargetTypechecked, false);
assert.equal(programFailure.claims.tacticExecuted, false);

const tripleFailure = analyze({
  modelBuild: result(0),
  programCheck: result(0),
  tripleCheck: result(1, "", "triple target type error"),
  requestRun: result(0, "this successful process must not override the failed Triple stage"),
});
assert.equal(tripleFailure.failedStage, "lean-triple-target-typecheck");
assert.equal(tripleFailure.claims.leanProgramTypechecked, true);
assert.equal(tripleFailure.claims.tripleTargetTypechecked, false);
assert.equal(tripleFailure.claims.tacticExecuted, false);
assert.equal(tripleFailure.claims.semanticProofDischarge, false);

const requestFailure = analyze({
  modelBuild: result(0),
  programCheck: result(0),
  tripleCheck: result(0),
  requestRun: result(1, "", "unknown specification theorem"),
});
assert.equal(requestFailure.failedStage, "vc-request-execution");
assert.equal(requestFailure.claims.tripleTargetTypechecked, true);
assert.equal(requestFailure.claims.tacticExecuted, false);
assert.equal(requestFailure.claims.realVerificationConditionsGenerated, false);
assert.equal(requestFailure.goalArtifact.summary.goalCount, 0);

const residualText = `unsolved goals
case debit
from : AccountId
amount : Nat
__ps_entry __ps_final : Bank
⊢ balanceOf from __ps_final = balanceOf from __ps_entry - amount
`;
const residual = classifyLeanResidualGoals(residualText);
assert.equal(residual.detected, true);
assert.equal(residual.unsolvedMarker, true);
assert.equal(residual.goalLines.length, 1);
assert.equal(residual.traceBlocks.length, 1);
assert.equal(residual.rawOutputSha256.length, 64);

const vcRun = analyze({
  modelBuild: result(0),
  programCheck: result(0),
  tripleCheck: result(0),
  requestRun: result(1, residualText),
});
assert.equal(vcRun.status, "vcs-generated");
assert.equal(vcRun.failedStage, "vc-residual-goals");
assert.equal(vcRun.claims.tacticExecuted, true);
assert.equal(vcRun.claims.semanticVcDerivationComplete, true);
assert.equal(vcRun.claims.realVerificationConditionsGenerated, true);
assert.equal(vcRun.claims.semanticProofDischarge, false);
assert.equal(vcRun.goalArtifact.schema, "proofscript.stateful-vc-goals/v1");
assert.equal(vcRun.goalArtifact.generatedFromLeanExecution, true);
assert.equal(vcRun.goalArtifact.summary.goalCount, 1);
assert.match(vcRun.goalArtifact.goals[0].id, /^withdraw\.stateful\.vc\.001\.[0-9a-f]{12}$/u);
assert.equal(vcRun.goalArtifact.goals[0].traceSha256.length, 64);
assert.equal(vcRun.goalArtifact.goals[0].discharged, false);

const vcRunAgain = analyze({
  modelBuild: result(0),
  programCheck: result(0),
  tripleCheck: result(0),
  requestRun: result(1, residualText),
});
assert.equal(vcRunAgain.goalArtifact.goals[0].id, vcRun.goalArtifact.goals[0].id);

const proved = analyze({
  modelBuild: result(0),
  programCheck: result(0),
  tripleCheck: result(0),
  requestRun: result(0, "All goals completed!"),
});
assert.equal(proved.status, "proved");
assert.equal(proved.failedStage, null);
assert.equal(proved.claims.leanEnvironmentResolved, true);
assert.equal(proved.claims.leanModelTypechecked, true);
assert.equal(proved.claims.leanProgramTypechecked, true);
assert.equal(proved.claims.tripleTargetTypechecked, true);
assert.equal(proved.claims.tacticExecuted, true);
assert.equal(proved.claims.semanticVcDerivationComplete, true);
assert.equal(proved.claims.realVerificationConditionsGenerated, true);
assert.equal(proved.claims.semanticProofDischarge, true);
assert.equal(proved.claims.stateModelAdequacyChecked, false);
assert.equal(proved.claims.sourceToLeanProgramEquivalenceChecked, false);
assert.equal(proved.claims.exceptionalPathsCovered, false);
assert.equal(proved.goalArtifact.summary.goalCount, 0);
assert.equal(proved.goalArtifact.semanticProofDischarge, true);

console.log("PS3_STATEFUL_VC_EVIDENCE_TESTS=PASS");
