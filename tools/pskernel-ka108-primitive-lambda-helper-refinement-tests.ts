#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka108-primitive-lambda-helper-refinement.ts',
  'assurance/ka108/primitive-lambda-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA108PrimitiveLambdaHelperRefinement } = await import('./pskernel-ka108-primitive-lambda-helper-refinement.ts');
const result = runKA108PrimitiveLambdaHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka108-primitive-lambda-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.111');
assert.equal(result.baseline, 'proofscript-v1-ka107-primitive-telescope-shape-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 361);
assert.deepEqual(result.countedObligations, [
  'translated_vexpr_lams_appN_prime_wf',
  'translated_lambdaTelescope_wf',
  'translated_vexpr_wf_app_inv_prime_wf',
  'translated_vexpr_wf_lam_inv_prime_wf',
  'translated_vexpr_wf_betaU_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka108/KA108_PRIMITIVE_LAMBDA_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka108/KA108_PRIMITIVE_LAMBDA_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka108/KA108_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka108/KA108_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka108/KA108_PRIMITIVE_LAMBDA_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
