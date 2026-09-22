#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA28QuotEnvDefEqPreservationBridgeGate } from './pskernel-ka28-quot-env-defeq-preservation-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka28/quot-env-defeq-preservation-bridge.lean',
  'assurance/ka28/quot-env-defeq-preservation-bridge.json',
  'assurance/ka28/obligation-delta.json',
  'assurance/ka28/KA28_RELEASE_GATE.json',
  'assurance/ka28/KA28_REPORT.md',
  'tools/pskernel-ka28-quot-env-defeq-preservation-bridge.ts',
  'tools/pskernel-ka28-quot-env-defeq-preservation-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka28-quot-env-defeq-preservation-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA28QuotEnvDefEqPreservationBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka28-quot-env-defeq-preservation-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.31');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka27-quot-env-no-overwrite-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanQuotEnvDefEqPreservationBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.coveredPSDeclKinds, ['quot']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA28.translated_quot_preserves_existing_defeq',
  'PSKernelKA28.translated_quot_preserves_existing_and_adds_quot_defeq',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.quotientSemanticSoundness, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 50);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanQuotEnvDefEqPreservationBridgeChecked: result.directLean4LeanQuotEnvDefEqPreservationBridgeChecked }, null, 2));
