#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA29QuotEnvAggregateBridgeGate } from './pskernel-ka29-quot-env-aggregate-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka29/quot-env-aggregate-bridge.lean',
  'assurance/ka29/quot-env-aggregate-bridge.json',
  'assurance/ka29/obligation-delta.json',
  'assurance/ka29/KA29_RELEASE_GATE.json',
  'assurance/ka29/KA29_REPORT.md',
  'tools/pskernel-ka29-quot-env-aggregate-bridge.ts',
  'tools/pskernel-ka29-quot-env-aggregate-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka29-quot-env-aggregate-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA29QuotEnvAggregateBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka29-quot-env-aggregate-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.32');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka28-quot-env-defeq-preservation-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanQuotEnvAggregateBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.coveredPSDeclKinds, ['quot']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA29.translated_quot_env_aggregate_bridge',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.quotientSemanticSoundness, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 51);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanQuotEnvAggregateBridgeChecked: result.directLean4LeanQuotEnvAggregateBridgeChecked }, null, 2));
