#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA86PrimitiveDivModRecognizerRefinement } from './pskernel-ka86-primitive-divmod-recognizer-refinement.ts';

const result = runKA86PrimitiveDivModRecognizerRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka86-primitive-divmod-recognizer-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.89');
assert.equal(result.baseline, 'proofscript-v1-ka85-primitive-bitwise-recognizer-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.strictLean4LeanStatus, 'passed');
assert.equal(result.newFormalLean4LeanBridgeObligations, 2);
assert.equal(result.formalLean4LeanBridgeObligations, 267);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 97);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 64);
assert.deepEqual(result.countedObligations, ['translated_checkNatMod_wf', 'translated_checkNatDiv_wf']);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
