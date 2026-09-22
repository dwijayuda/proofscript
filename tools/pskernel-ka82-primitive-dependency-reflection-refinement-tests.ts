#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA82PrimitiveDependencyReflectionRefinement } from './pskernel-ka82-primitive-dependency-reflection-refinement.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka82-primitive-dependency-reflection-refinement.ts',
  'tools/pskernel-ka82-primitive-dependency-reflection-refinement-tests.ts',
  'assurance/ka82/primitive-dependency-reflection-refinement-bridge.lean',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
const result = runKA82PrimitiveDependencyReflectionRefinement({ writeReports: true, strict: true });
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka82-primitive-dependency-reflection-refinement0');
assert.equal(result.publicVersion, '1.0.0-pskernel.85');
assert.equal(result.baseline, 'proofscript-v1-ka81-primitive-reflection-typing-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baselineObligations, 242);
assert.equal(result.newFormalLean4LeanBridgeObligations, 7);
assert.equal(result.formalLean4LeanBridgeObligations, 249);
assert.deepEqual(result.countedObligations, [
  'translated_containsNatOfHasType_wf',
  'translated_natOfPred_wf',
  'translated_natOfAdd_wf',
  'translated_natOfMul_wf',
  'translated_natOfDiv_wf',
  'translated_natOfMod_wf',
  'translated_boolOfBitwise_wf',
]);
assert.equal(result.featureSurfaceBridgeProgressPercent, 93);
assert.equal(result.executableKernelEquivalenceProofProgressPercent, 60);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, obligations: result.formalLean4LeanBridgeObligations }, null, 2));
