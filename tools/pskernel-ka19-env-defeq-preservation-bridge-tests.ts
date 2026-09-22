#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA19EnvDefEqPreservationBridgeGate } from './pskernel-ka19-env-defeq-preservation-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka19/env-defeq-preservation-bridge.lean',
  'assurance/ka19/env-defeq-preservation-bridge.json',
  'assurance/ka19/obligation-delta.json',
  'assurance/ka19/KA19_RELEASE_GATE.json',
  'assurance/ka19/KA19_REPORT.md',
  'tools/pskernel-ka19-env-defeq-preservation-bridge.ts',
  'tools/pskernel-ka19-env-defeq-preservation-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka19-env-defeq-preservation-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA19EnvDefEqPreservationBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka19-env-defeq-preservation-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.22');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka18-env-no-overwrite-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanEnvDefEqPreservationBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.bridgedRelations, [
  'Lean4Lean.VEnv.addConst',
  'Lean4Lean.VEnv.addDefEq',
  'Lean4Lean.VEnv.defeqs',
]);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA19.translated_axiom_preserves_existing_defeq',
  'PSKernelKA19.translated_definition_preserves_existing_defeq',
  'PSKernelKA19.translated_definition_preserves_existing_and_adds_new_defeq',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 16);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanEnvDefEqPreservationBridgeChecked: result.directLean4LeanEnvDefEqPreservationBridgeChecked }, null, 2));
