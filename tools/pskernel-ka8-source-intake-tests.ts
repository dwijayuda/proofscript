#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA8Gate } from './pskernel-ka8-source-intake.ts';

const gate = runKA8Gate({ soft: true });
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.archiveIntakeSupported, true);
assert.ok(gate.archiveDiscovery.length >= 8);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.ok(gate.closedByKA8 >= 5);
assert.ok(gate.stillOpenObligations >= 6);
assert.equal(gate.actualLean4LeanImportBound, gate.strictActualImportPassed);
if (!gate.actualLean4LeanSourcePresent) {
  assert.equal(gate.strictActualImportPassed, false);
  assert.equal(gate.blockedReason, 'lean4lean_source_missing');
}
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, sourcePresent: gate.actualLean4LeanSourcePresent, strictActualImportPassed: gate.strictActualImportPassed, blockedReason: gate.blockedReason }, null, 2));
