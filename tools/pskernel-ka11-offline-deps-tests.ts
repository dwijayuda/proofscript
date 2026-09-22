#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA11Gate } from './pskernel-ka11-offline-deps.ts';

const gate = runKA11Gate({ soft: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka11-offline-lean4lean-deps0');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.actualLean4LeanSourcePresent, true);
assert.equal(gate.exactBatteriesDependencyPresent, true);
assert.equal(gate.lean4leanToolchainAccepted, true);
assert.equal(gate.batteriesToolchain, 'leanprover/lean4:v4.33.0-rc2');
assert.equal(gate.batteriesExactRev, true);
assert.equal(gate.strictActualImportPassed, true);
assert.equal(gate.actualLean4LeanImportBound, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, importBound: gate.actualLean4LeanImportBound }, null, 2));
