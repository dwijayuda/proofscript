#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA88PrimitiveGcdRecognizerRefinement } from './pskernel-ka88-primitive-gcd-recognizer-refinement.ts';

const result = runKA88PrimitiveGcdRecognizerRefinement({ writeReports: true, strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka88-primitive-gcd-recognizer-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.91');
assert.equal(result.baseline, 'proofscript-v1-ka87-primitive-arithmetic-recognizer-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.strictLean4LeanStatus, 'passed');
assert.equal(result.newFormalLean4LeanBridgeObligations, 1);
assert.equal(result.formalLean4LeanBridgeObligations, 273);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 98);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 66);
assert.deepEqual(result.countedObligations, ['translated_checkNatGcd_wf']);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
