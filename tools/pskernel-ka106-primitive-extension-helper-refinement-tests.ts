#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka106-primitive-extension-helper-refinement.ts',
  'assurance/ka106/primitive-extension-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA106PrimitiveExtensionHelperRefinement } = await import('./pskernel-ka106-primitive-extension-helper-refinement.ts');
const result = runKA106PrimitiveExtensionHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka106-primitive-extension-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.109');
assert.equal(result.baseline, 'proofscript-v1-ka105-primitive-defeq-application-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 351);
assert.deepEqual(result.countedObligations, [
  'translated_vcontext_ext_mono_wf',
  'translated_vcontext_ext_monoT_wf',
  'translated_vcontext_ext_monoW_wf',
  'translated_vcontext_ext_monoIsType_wf',
  'translated_vcontext_ext_monoCtx_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka106/KA106_PRIMITIVE_EXTENSION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka106/KA106_PRIMITIVE_EXTENSION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka106/KA106_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka106/KA106_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka106/KA106_PRIMITIVE_EXTENSION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
