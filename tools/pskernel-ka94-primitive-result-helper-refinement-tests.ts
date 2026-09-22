#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka94-primitive-result-helper-refinement.ts',
  'assurance/ka94/primitive-result-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA94PrimitiveResultHelperRefinement } = await import('./pskernel-ka94-primitive-result-helper-refinement.ts');
const result = runKA94PrimitiveResultHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka94-primitive-result-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.97');
assert.equal(result.baseline, 'proofscript-v1-ka93-primitive-basic-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 293);
assert.deepEqual(result.countedObligations, [
  'translated_mkResult_wf',
  'translated_mkResult1_wf',
  'translated_mkResultBool_wf',
  'translated_mkResultBitwise_wf',
  'translated_mkResultTypeEq_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka94/KA94_PRIMITIVE_RESULT_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka94/KA94_PRIMITIVE_RESULT_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka94/KA94_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka94/KA94_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka94/KA94_PRIMITIVE_RESULT_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
