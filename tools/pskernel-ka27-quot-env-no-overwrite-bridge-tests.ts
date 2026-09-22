#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA27QuotEnvNoOverwriteBridgeGate } from './pskernel-ka27-quot-env-no-overwrite-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka27/quot-env-no-overwrite-bridge.lean',
  'assurance/ka27/quot-env-no-overwrite-bridge.json',
  'assurance/ka27/obligation-delta.json',
  'assurance/ka27/KA27_RELEASE_GATE.json',
  'assurance/ka27/KA27_REPORT.md',
  'tools/pskernel-ka27-quot-env-no-overwrite-bridge.ts',
  'tools/pskernel-ka27-quot-env-no-overwrite-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka27-quot-env-no-overwrite-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA27QuotEnvNoOverwriteBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka27-quot-env-no-overwrite-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.30');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka26-quot-env-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanQuotEnvNoOverwriteBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.coveredPSDeclKinds, ['quot']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA27.translated_quot_fresh_quot_before_add',
  'PSKernelKA27.translated_quot_fresh_quot_mk_before_add',
  'PSKernelKA27.translated_quot_fresh_quot_lift_before_add',
  'PSKernelKA27.translated_quot_fresh_quot_ind_before_add',
  'PSKernelKA27.translated_quot_preserves_other_lookup',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.quotientSemanticSoundness, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 48);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanQuotEnvNoOverwriteBridgeChecked: result.directLean4LeanQuotEnvNoOverwriteBridgeChecked }, null, 2));
