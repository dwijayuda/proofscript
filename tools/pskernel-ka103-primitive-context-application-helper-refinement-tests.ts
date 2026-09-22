#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka103-primitive-context-application-helper-refinement.ts',
  'assurance/ka103/primitive-context-application-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA103PrimitiveContextApplicationHelperRefinement } = await import('./pskernel-ka103-primitive-context-application-helper-refinement.ts');
const result = runKA103PrimitiveContextApplicationHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka103-primitive-context-application-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.106');
assert.equal(result.baseline, 'proofscript-v1-ka102-primitive-substitution-composition-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 336);
assert.deepEqual(result.countedObligations, [
  'translated_onctx_of_append_wf',
  'translated_vexpr_wf_app_inv2_wf',
  'translated_vexpr_wf_appN_inv_wf',
  'translated_isDefEqU_appN_wf',
  'translated_argsTyped_natTelescope_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka103/KA103_PRIMITIVE_CONTEXT_APPLICATION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka103/KA103_PRIMITIVE_CONTEXT_APPLICATION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka103/KA103_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka103/KA103_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka103/KA103_PRIMITIVE_CONTEXT_APPLICATION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
