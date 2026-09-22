#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka105-primitive-defeq-application-helper-refinement.ts',
  'assurance/ka105/primitive-defeq-application-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA105PrimitiveDefeqApplicationHelperRefinement } = await import('./pskernel-ka105-primitive-defeq-application-helper-refinement.ts');
const result = runKA105PrimitiveDefeqApplicationHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka105-primitive-defeq-application-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.108');
assert.equal(result.baseline, 'proofscript-v1-ka104-primitive-telescope-typing-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 346);
assert.deepEqual(result.countedObligations, [
  'translated_isDefEqU_appN_prime_wf',
  'translated_trExprS_appN_wf',
  'translated_isDefEqU_app_arg_wf',
  'translated_vexpr_lams_ctx_wf',
  'translated_vexpr_lams_appN_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka105/KA105_PRIMITIVE_DEFEQ_APPLICATION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka105/KA105_PRIMITIVE_DEFEQ_APPLICATION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka105/KA105_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka105/KA105_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka105/KA105_PRIMITIVE_DEFEQ_APPLICATION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
