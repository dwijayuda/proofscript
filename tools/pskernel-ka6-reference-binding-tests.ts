#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runKA6Gate } from './pskernel-ka6-reference-binding.ts';

const gate = runKA6Gate({ strict: true });
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.leanCheckedHere, true);
assert.equal(gate.bindingKind, 'lean4lean-compatible-reference-interface');
assert.equal(gate.actualLean4LeanImportBound, false);
assert.ok(gate.closedMachineCheckedScaffoldObligations >= 5);
assert.ok(gate.stillOpenObligations >= 8);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, leanCheckedHere: gate.leanCheckedHere }, null, 2));
