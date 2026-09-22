#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka99-primitive-closure-helper-refinement.ts',
  'assurance/ka99/primitive-closure-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA99PrimitiveClosureHelperRefinement } = await import('./pskernel-ka99-primitive-closure-helper-refinement.ts');
const result = runKA99PrimitiveClosureHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka99-primitive-closure-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.102');
assert.equal(result.baseline, 'proofscript-v1-ka98-primitive-fuel-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 316);
assert.deepEqual(result.countedObligations, [
  'translated_fvarsIn_appN_wf',
  'translated_trExpr_appN_inv_wf',
  'translated_trExpr_app2_inv_wf',
  'translated_trExpr_closedN_nil_wf',
  'translated_trExpr_fvar_lift_uniq_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka99/KA99_PRIMITIVE_CLOSURE_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka99/KA99_PRIMITIVE_CLOSURE_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka99/KA99_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka99/KA99_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka99/KA99_PRIMITIVE_CLOSURE_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
