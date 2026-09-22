#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka97-primitive-instantiation-helper-refinement.ts',
  'assurance/ka97/primitive-instantiation-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA97PrimitiveInstantiationHelperRefinement } = await import('./pskernel-ka97-primitive-instantiation-helper-refinement.ts');
const result = runKA97PrimitiveInstantiationHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka97-primitive-instantiation-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.100');
assert.equal(result.baseline, 'proofscript-v1-ka96-primitive-application-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 306);
assert.deepEqual(result.countedObligations, [
  'translated_vexpr_liftN_lams_indexed_wf',
  'translated_list_mapIdx_replicate_nat_wf',
  'translated_vexpr_closedN_subst_eq_wf',
  'translated_onctx_nat_telescope_wf',
  'translated_ctx_liftN_nat_telescope_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka97/KA97_PRIMITIVE_INSTANTIATION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka97/KA97_PRIMITIVE_INSTANTIATION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka97/KA97_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka97/KA97_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka97/KA97_PRIMITIVE_INSTANTIATION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
