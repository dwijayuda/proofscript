#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka93-primitive-basic-helper-refinement.ts',
  'assurance/ka93/primitive-basic-helper-refinement-bridge.lean',
  'assurance/ka93/KA93_PRIMITIVE_BASIC_HELPER_REFINEMENT_BRIDGE_SPEC.json',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const { runKA93PrimitiveBasicHelperRefinement } = await import('./pskernel-ka93-primitive-basic-helper-refinement.ts');
const result = runKA93PrimitiveBasicHelperRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka93-primitive-basic-helper-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.96');
assert.equal(result.baseline, 'proofscript-v1-ka92-primitive-char-string-recognizer-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 5);
assert.equal(result.formalLean4LeanBridgeObligations, 288);
assert.deepEqual(result.countedObligations, [
  'translated_contains_primitive_wf',
  'translated_natBinLit_wf',
  'translated_natBinLitBool_wf',
  'translated_withNatProbe_wf',
  'translated_withBoolProbe_wf',
]);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka93/KA93_PRIMITIVE_BASIC_HELPER_REFINEMENT_RELEASE_GATE.json',
  'assurance/ka93/KA93_PRIMITIVE_BASIC_HELPER_REFINEMENT_VERIFICATION_SUMMARY.json',
  'assurance/ka93/KA93_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka93/KA93_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka93/KA93_PRIMITIVE_BASIC_HELPER_REFINEMENT_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations}, null, 2));
