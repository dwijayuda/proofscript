#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA84PrimitiveConditionReflectionRefinement } from './pskernel-ka84-primitive-condition-reflection-refinement.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka84-primitive-condition-reflection-refinement.ts',
  'tools/pskernel-ka84-primitive-condition-reflection-refinement-tests.ts',
  'assurance/ka84/primitive-condition-reflection-refinement-bridge.lean',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const result = runKA84PrimitiveConditionReflectionRefinement({ writeReports: true, strict: true });
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka84-primitive-condition-reflection-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.87');
assert.equal(result.baseline, 'proofscript-v1-ka83-primitive-type-translation-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baselineObligations, 255);
assert.equal(result.newFormalLean4LeanBridgeObligations, 8);
assert.equal(result.formalLean4LeanBridgeObligations, 263);
assert.deepEqual(result.countedObligations, [
  'translated_boolProp_wf',
  'translated_propBoolProp_wf',
  'translated_boolNat3_wf',
  'translated_natNatProp_wf',
  'translated_natLE_apply_wf',
  'translated_natEq_apply_wf',
  'translated_natLE_apply_zero_wf',
  'translated_natEq_apply_zero_wf',
]);
assert.equal(result.featureSurfaceBridgeProgressPercent, 95);
assert.equal(result.executableKernelEquivalenceProofProgressPercent, 62);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
