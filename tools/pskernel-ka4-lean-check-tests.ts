#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverLean, runKA4LeanGate } from './pskernel-ka4-lean-check.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

for (const rel of [
  'assurance/ka4/lean-toolchain-gate.json',
  'assurance/ka4/machine-check-status.json',
  'assurance/ka4/lean4lean-binding-plan.json',
  'assurance/ka4/noninductive-soundness-machine-check.lean',
  'assurance/ka4/KA4_REPORT.md',
  'assurance/ka4/KA4_RELEASE_GATE.json',
]) assert.ok(exists(rel), `missing KA-4 artifact ${rel}`);

const gateSpec = readJson('assurance/ka4/lean-toolchain-gate.json');
assert.equal(gateSpec.schema, 'proofscript.assurance.ka4.lean-toolchain-gate/v1');
assert.equal(gateSpec.publicVersion, '1.0.0-pskernel.6');
assert.equal(gateSpec.targetLean.version, '4.33.1');
assert.equal(gateSpec.claimBoundary.fullLean4Equivalence, false);
assert.equal(gateSpec.claimBoundary.formalLean4EquivalenceProvenObligations, 0);

const machine = readJson('assurance/ka4/machine-check-status.json');
assert.equal(machine.schema, 'proofscript.assurance.ka4.machine-check-status/v1');
assert.equal(machine.leanCheckedHere, false);
assert.equal(machine.strictLeanCheckPassed, false);
assert.equal(machine.proofClaims.formalLean4EquivalenceProvenObligations, 0);

const skeleton = read('assurance/ka4/noninductive-soundness-machine-check.lean');
assert.match(skeleton, /namespace PSKernelKA4/);
assert.match(skeleton, /def translateDecl\?/);
assert.match(skeleton, /theorem noninductive_kind_translation_sound/);
assert.match(skeleton, /theorem unsupported_decl_kind_blocks_translation/);
assert.doesNotMatch(skeleton, /sorry/);
assert.doesNotMatch(skeleton, /admit/);

const discovery = discoverLean();
assert.equal(typeof discovery.lakeOnPath, 'boolean');
assert.equal(typeof discovery.sevenZipOnPath, 'boolean');
assert.equal(typeof discovery.archivePartsPresent, 'boolean');

const gate = runKA4LeanGate({ strict: false });
assert.match(gate.publicVersion, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(gate.coreFormat, 71);
assert.equal(gate.targetLeanVersion, '4.33.1');
assert.equal(gate.trustedKernelSemanticChange, false);
assert.equal(gate.kernelCodecChange, false);
assert.equal(gate.fullLean4Equivalence, false);
assert.equal(gate.formalLean4EquivalenceProvenObligations, 0);
assert.ok(['lean-unavailable','lean-version-mismatch','lean-check-failed','passed'].includes(gate.status));
if (gate.strictLeanCheckPassed) {
  assert.equal(gate.leanCheckedHere, true);
  assert.equal(gate.status, 'passed');
} else {
  assert.equal(gate.leanCheckedHere, false);
}

const versions = readJson('versions.json');
assert.equal(versions.implementation, readJson('package.json').version);
assert.match(versions.latestLocalLineageCheckpoint, /^proofscript-v1-/);
assert.equal(versions.ka4TrustedSemanticChange, false);
assert.equal(versions.ka4FormalLean4EquivalenceProvenObligations, 0);

console.log('PSKERNEL_KA4_LEAN_TOOLCHAIN_GATE=PASS');
