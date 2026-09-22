#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA24NonDefEnvNoOverwriteBridgeGate } from './pskernel-ka24-nondef-env-no-overwrite-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka24/nondef-env-no-overwrite-bridge.lean',
  'assurance/ka24/nondef-env-no-overwrite-bridge.json',
  'assurance/ka24/obligation-delta.json',
  'assurance/ka24/KA24_RELEASE_GATE.json',
  'assurance/ka24/KA24_REPORT.md',
  'tools/pskernel-ka24-nondef-env-no-overwrite-bridge.ts',
  'tools/pskernel-ka24-nondef-env-no-overwrite-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka24-nondef-env-no-overwrite-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA24NonDefEnvNoOverwriteBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka24-nondef-env-no-overwrite-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.27');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka23-nondef-env-lookup-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefEnvNoOverwriteBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.bridgedRelations, ['Lean4Lean.VEnv.addConst', 'Lean4Lean.VEnv.constants']);
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'opaque']);
assert.deepEqual(result.nonAddingPSDeclKinds, ['example']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA24.translated_theorem_fresh_before_add',
  'PSKernelKA24.translated_opaque_fresh_before_add',
  'PSKernelKA24.translated_theorem_preserves_other_lookup',
  'PSKernelKA24.translated_opaque_preserves_other_lookup',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 32);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefEnvNoOverwriteBridgeChecked: result.directLean4LeanNonDefEnvNoOverwriteBridgeChecked }, null, 2));
