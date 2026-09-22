#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka101-primitive-substitution-helper-refinement.ts',
  'assurance/ka101/primitive-substitution-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA101PrimitiveSubstitutionHelperRefinement } = await import('./pskernel-ka101-primitive-substitution-helper-refinement.ts');
const result = runKA101PrimitiveSubstitutionHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka101-primitive-substitution-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.104');
assert.equal(result.baseline, 'proofscript-v1-ka100-primitive-sequence-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 326);
assert.deepEqual(result.countedObligations, [
  'translated_forall2_rev_wf',
  'translated_trExpr_fvar_uniq_wf',
  'translated_forall2_fvars_uniq_wf',
  'translated_subst_consN_add_wf',
  'translated_liftN_subst_consN_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka101/KA101_PRIMITIVE_SUBSTITUTION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka101/KA101_PRIMITIVE_SUBSTITUTION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka101/KA101_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka101/KA101_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka101/KA101_PRIMITIVE_SUBSTITUTION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
