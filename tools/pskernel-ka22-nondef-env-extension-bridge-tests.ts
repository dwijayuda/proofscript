#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA22NonDefEnvExtensionBridgeGate } from './pskernel-ka22-nondef-env-extension-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka22/nondef-env-extension-bridge.lean',
  'assurance/ka22/nondef-env-extension-bridge.json',
  'assurance/ka22/obligation-delta.json',
  'assurance/ka22/KA22_RELEASE_GATE.json',
  'assurance/ka22/KA22_REPORT.md',
  'tools/pskernel-ka22-nondef-env-extension-bridge.ts',
  'tools/pskernel-ka22-nondef-env-extension-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka22-nondef-env-extension-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA22NonDefEnvExtensionBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka22-nondef-env-extension-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.25');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka21-nondef-env-wf-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefEnvExtensionBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.equal(result.bridgedRelation, 'Lean4Lean.VEnv.LE');
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'example', 'opaque']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA22.translated_theorem_env_extends',
  'PSKernelKA22.translated_example_env_extends',
  'PSKernelKA22.translated_opaque_env_extends',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 25);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefEnvExtensionBridgeChecked: result.directLean4LeanNonDefEnvExtensionBridgeChecked }, null, 2));
