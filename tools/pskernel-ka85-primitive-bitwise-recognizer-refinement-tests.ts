#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA85PrimitiveBitwiseRecognizerRefinement } from './pskernel-ka85-primitive-bitwise-recognizer-refinement.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka85-primitive-bitwise-recognizer-refinement.ts',
  'tools/pskernel-ka85-primitive-bitwise-recognizer-refinement-tests.ts',
  'assurance/ka85/primitive-bitwise-recognizer-refinement-bridge.lean',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA85PrimitiveBitwiseRecognizerRefinement({ writeReports: true, strict: true });
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka85-primitive-bitwise-recognizer-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.88');
assert.equal(result.baseline, 'proofscript-v1-ka84-primitive-condition-reflection-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baselineObligations, 263);
assert.equal(result.newFormalLean4LeanBridgeObligations, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 265);
assert.deepEqual(result.countedObligations, [
  'translated_boolOp2_apply_wf',
  'translated_checkNatBitwise_wf',
]);
assert.equal(result.featureSurfaceBridgeProgressPercent, 96);
assert.equal(result.executableKernelEquivalenceProofProgressPercent, 63);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
