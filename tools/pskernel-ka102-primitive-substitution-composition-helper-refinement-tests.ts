#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka102-primitive-substitution-composition-helper-refinement.ts',
  'assurance/ka102/primitive-substitution-composition-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA102PrimitiveSubstitutionCompositionHelperRefinement } = await import('./pskernel-ka102-primitive-substitution-composition-helper-refinement.ts');
const result = runKA102PrimitiveSubstitutionCompositionHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka102-primitive-substitution-composition-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.105');
assert.equal(result.baseline, 'proofscript-v1-ka101-primitive-substitution-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 331);
assert.deepEqual(result.countedObligations, [
  'translated_subst_consN_bvars_wf',
  'translated_subst_lift_tail_inst_wf',
  'translated_subst_consN_append_wf',
  'translated_subst_consN_append_singleton_wf',
  'translated_subst_lift_comp_one_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka102/KA102_PRIMITIVE_SUBSTITUTION_COMPOSITION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka102/KA102_PRIMITIVE_SUBSTITUTION_COMPOSITION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka102/KA102_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka102/KA102_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka102/KA102_PRIMITIVE_SUBSTITUTION_COMPOSITION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
