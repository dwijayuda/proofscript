#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA83PrimitiveTypeTranslationRefinement } from './pskernel-ka83-primitive-type-translation-refinement.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka83-primitive-type-translation-refinement.ts',
  'tools/pskernel-ka83-primitive-type-translation-refinement-tests.ts',
  'assurance/ka83/primitive-type-translation-refinement-bridge.lean',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const result = runKA83PrimitiveTypeTranslationRefinement({ writeReports: true, strict: true });
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka83-primitive-type-translation-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.86');
assert.equal(result.baseline, 'proofscript-v1-ka82-primitive-dependency-reflection-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baselineObligations, 249);
assert.equal(result.newFormalLean4LeanBridgeObligations, 6);
assert.equal(result.formalLean4LeanBridgeObligations, 255);
assert.deepEqual(result.countedObligations, [
  'translated_natLitClosed_wf',
  'translated_natFstLamApp_wf',
  'translated_natIsType_wf',
  'translated_trNat_wf',
  'translated_boolIsType_wf',
  'translated_trBool_wf',
]);
assert.equal(result.featureSurfaceBridgeProgressPercent, 94);
assert.equal(result.executableKernelEquivalenceProofProgressPercent, 61);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
