#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka98-primitive-fuel-helper-refinement.ts',
  'assurance/ka98/primitive-fuel-helper-refinement-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA98PrimitiveFuelHelperRefinement } = await import('./pskernel-ka98-primitive-fuel-helper-refinement.ts');
const result = runKA98PrimitiveFuelHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka98-primitive-fuel-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.101');
assert.equal(result.baseline, 'proofscript-v1-ka97-primitive-instantiation-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 311);
assert.deepEqual(result.countedObligations, [
  'translated_data_uvars_eq_wf',
  'translated_goArgs_wf',
  'translated_natFuelRec_wf',
  'translated_elseFail_wf',
  'translated_hok_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka98/KA98_PRIMITIVE_FUEL_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka98/KA98_PRIMITIVE_FUEL_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka98/KA98_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka98/KA98_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka98/KA98_PRIMITIVE_FUEL_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
