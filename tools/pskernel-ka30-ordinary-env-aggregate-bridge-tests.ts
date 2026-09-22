#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA30OrdinaryEnvAggregateBridgeGate } from './pskernel-ka30-ordinary-env-aggregate-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka30/ordinary-env-aggregate-bridge.lean',
  'assurance/ka30/ordinary-env-aggregate-bridge.json',
  'assurance/ka30/obligation-delta.json',
  'assurance/ka30/KA30_RELEASE_GATE.json',
  'assurance/ka30/KA30_REPORT.md',
  'tools/pskernel-ka30-ordinary-env-aggregate-bridge.ts',
  'tools/pskernel-ka30-ordinary-env-aggregate-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka30-ordinary-env-aggregate-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA30OrdinaryEnvAggregateBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka30-ordinary-env-aggregate-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.33');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka29-quot-env-aggregate-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanOrdinaryEnvAggregateBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.coveredPSDeclKinds, ['axiom', 'definition', 'theorem', 'opaque']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA30.translated_axiom_env_aggregate_bridge',
  'PSKernelKA30.translated_definition_env_aggregate_bridge',
  'PSKernelKA30.translated_theorem_env_aggregate_bridge',
  'PSKernelKA30.translated_opaque_env_aggregate_bridge',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.quotientSemanticSoundness, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 55);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanOrdinaryEnvAggregateBridgeChecked: result.directLean4LeanOrdinaryEnvAggregateBridgeChecked }, null, 2));
