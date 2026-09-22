#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA12ReferenceGate } from './pskernel-ka12-direct-reference.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'assurance/ka12/direct-lean4lean-reference.lean',
  'assurance/ka12/direct-reference-binding.json',
  'assurance/ka12/obligation-delta.json',
  'assurance/ka12/KA12_REPORT.md',
  'assurance/ka12/KA12_RELEASE_GATE.json',
  'tools/pskernel-ka12-direct-reference.ts',
  'tools/pskernel-ka12-direct-reference-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka12-direct-lean4lean-reference.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const gate = runKA12ReferenceGate({ strict: true });
assert.equal(gate.checkpoint, 'proofscript-v1-ka12-direct-lean4lean-reference0');
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.referenceKind, 'direct-imported-lean4lean-reference-types');
assert.equal(gate.actualLean4LeanImportBound, true);
assert.equal(gate.directLean4LeanReferenceChecked, true);
assert.equal(gate.strictReferenceCheckPassed, true);
assert.deepEqual(gate.blockedReasons, []);
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.newTrustedComputationRule, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.sameTheoryAsFullLean4, false);
assert.equal(gate.fullyFormalK3, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
console.log(JSON.stringify({ status: 'passed', checkpoint: gate.checkpoint, directLean4LeanReferenceChecked: gate.directLean4LeanReferenceChecked }, null, 2));
