#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA25NonDefEnvDefEqPreservationBridgeGate } from './pskernel-ka25-nondef-env-defeq-preservation-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka25/nondef-env-defeq-preservation-bridge.lean',
  'assurance/ka25/nondef-env-defeq-preservation-bridge.json',
  'assurance/ka25/obligation-delta.json',
  'assurance/ka25/KA25_RELEASE_GATE.json',
  'assurance/ka25/KA25_REPORT.md',
  'tools/pskernel-ka25-nondef-env-defeq-preservation-bridge.ts',
  'tools/pskernel-ka25-nondef-env-defeq-preservation-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka25-nondef-env-defeq-preservation-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA25NonDefEnvDefEqPreservationBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka25-nondef-env-defeq-preservation-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.28');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka24-nondef-env-no-overwrite-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefEnvDefEqPreservationBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.bridgedRelations, ['Lean4Lean.VEnv.addConst', 'Lean4Lean.VEnv.addDefEq', 'Lean4Lean.VEnv.defeqs']);
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'opaque']);
assert.deepEqual(result.nonAddingPSDeclKinds, ['example']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA25.translated_theorem_preserves_existing_defeq',
  'PSKernelKA25.translated_theorem_preserves_existing_and_adds_new_defeq',
  'PSKernelKA25.translated_opaque_preserves_existing_defeq',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 35);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefEnvDefEqPreservationBridgeChecked: result.directLean4LeanNonDefEnvDefEqPreservationBridgeChecked }, null, 2));
