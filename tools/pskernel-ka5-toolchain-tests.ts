#!/usr/bin/env node
import assert from 'node:assert/strict';
import { materializeLean4331, runKA5Gate } from './pskernel-ka5-toolchain.ts';

const materialized = materializeLean4331();
assert.equal(materialized.ok, true);
assert.ok(materialized.leanPath.endsWith('/lean-4.33.1-linux/bin/lean'));
assert.ok(materialized.lakePath.endsWith('/lean-4.33.1-linux/bin/lake'));

const gate = runKA5Gate({ strict: true });
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.leanCheckedHere, true);
assert.equal(gate.strictLeanCheckPassed, true);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.match(gate.ka4Strict.discovery.versionText ?? '', /4\.33\.1/);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, strictLeanCheckPassed: gate.strictLeanCheckPassed }, null, 2));
