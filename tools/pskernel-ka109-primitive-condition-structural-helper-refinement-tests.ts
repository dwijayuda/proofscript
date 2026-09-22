#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka109-primitive-condition-structural-helper-refinement.ts',
  'assurance/ka109/primitive-condition-structural-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA109PrimitiveConditionStructuralHelperRefinement } = await import('./pskernel-ka109-primitive-condition-structural-helper-refinement.ts');
const result = runKA109PrimitiveConditionStructuralHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka109-primitive-condition-structural-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.112');
assert.equal(result.baseline, 'proofscript-v1-ka108-primitive-lambda-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 366);
assert.deepEqual(result.countedObligations, [
  'translated_condition_wf_hprop0_wf',
  'translated_condition_wf_hdec0_wf',
  'translated_condition_wf_prop_closed_wf',
  'translated_condition_wf_dec_closed_wf',
  'translated_condition_impl_ok_reflect_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka109/KA109_PRIMITIVE_CONDITION_STRUCTURAL_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka109/KA109_PRIMITIVE_CONDITION_STRUCTURAL_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka109/KA109_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka109/KA109_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka109/KA109_PRIMITIVE_CONDITION_STRUCTURAL_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
