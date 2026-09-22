#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA7Gate } from './pskernel-ka7-real-import.ts';

const gate = runKA7Gate({ soft: true });
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.ka6CompatibleScaffoldStillChecks, true);
assert.equal(gate.actualLean4LeanImportBound, gate.strictActualImportPassed);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.ok(gate.closedByKA7 >= 5);
assert.ok(gate.stillOpenObligations >= 8);
if (!gate.actualLean4LeanSourcePresent) {
  assert.equal(gate.strictActualImportPassed, false);
  assert.equal(gate.blockedReason, 'lean4lean_source_missing');
}
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, sourcePresent: gate.actualLean4LeanSourcePresent, strictActualImportPassed: gate.strictActualImportPassed, blockedReason: gate.blockedReason }, null, 2));
