#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka96-primitive-application-helper-refinement.ts',
  'assurance/ka96/primitive-application-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA96PrimitiveApplicationHelperRefinement } = await import('./pskernel-ka96-primitive-application-helper-refinement.ts');
const result = runKA96PrimitiveApplicationHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka96-primitive-application-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.99');
assert.equal(result.baseline, 'proofscript-v1-ka95-primitive-typeeq-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 301);
assert.deepEqual(result.countedObligations, [
  'translated_vexpr_insts_appN_wf',
  'translated_vexpr_subst_appN_wf',
  'translated_vexpr_lams_append_wf',
  'translated_expr_appN_eq_mkAppList_wf',
  'translated_expr_mkAppN_eq_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka96/KA96_PRIMITIVE_APPLICATION_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka96/KA96_PRIMITIVE_APPLICATION_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka96/KA96_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka96/KA96_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka96/KA96_PRIMITIVE_APPLICATION_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
