#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka107-primitive-telescope-shape-helper-refinement.ts',
  'assurance/ka107/primitive-telescope-shape-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA107PrimitiveTelescopeShapeHelperRefinement } = await import('./pskernel-ka107-primitive-telescope-shape-helper-refinement.ts');
const result = runKA107PrimitiveTelescopeShapeHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka107-primitive-telescope-shape-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.110');
assert.equal(result.baseline, 'proofscript-v1-ka106-primitive-extension-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 356);
assert.deepEqual(result.countedObligations, [
  'translated_mlctx_dropN_toCtx_length_wf',
  'translated_mlctx_head_vlam_wf',
  'translated_mlctx_mkLambda_eq_lams_wf',
  'translated_expr_natBinderTypes_of_abstract1_wf',
  'translated_mlctx_mkLambda_natBinderTypes_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka107/KA107_PRIMITIVE_TELESCOPE_SHAPE_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka107/KA107_PRIMITIVE_TELESCOPE_SHAPE_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka107/KA107_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka107/KA107_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka107/KA107_PRIMITIVE_TELESCOPE_SHAPE_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
