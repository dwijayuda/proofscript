#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka100-primitive-sequence-helper-refinement.ts',
  'assurance/ka100/primitive-sequence-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA100PrimitiveSequenceHelperRefinement } = await import('./pskernel-ka100-primitive-sequence-helper-refinement.ts');
const result = runKA100PrimitiveSequenceHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka100-primitive-sequence-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.103');
assert.equal(result.baseline, 'proofscript-v1-ka99-primitive-closure-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 321);
assert.deepEqual(result.countedObligations, [
  'translated_trExpr_underBV_wf',
  'translated_forall2_append_inv_wf',
  'translated_vexpr_appN_append_wf',
  'translated_forall_mem_pair_wf',
  'translated_forall2_snoc_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka100/KA100_PRIMITIVE_SEQUENCE_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka100/KA100_PRIMITIVE_SEQUENCE_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka100/KA100_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka100/KA100_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka100/KA100_PRIMITIVE_SEQUENCE_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
