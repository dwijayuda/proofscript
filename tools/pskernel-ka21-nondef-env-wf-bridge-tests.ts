#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA21NonDefEnvWFBridgeGate } from './pskernel-ka21-nondef-env-wf-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka21/nondef-env-wf-bridge.lean',
  'assurance/ka21/nondef-env-wf-bridge.json',
  'assurance/ka21/obligation-delta.json',
  'assurance/ka21/KA21_RELEASE_GATE.json',
  'assurance/ka21/KA21_REPORT.md',
  'tools/pskernel-ka21-nondef-env-wf-bridge.ts',
  'tools/pskernel-ka21-nondef-env-wf-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka21-nondef-env-wf-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA21NonDefEnvWFBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka21-nondef-env-wf-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.24');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka20-nondef-vdecl-wf-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefEnvWFBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.equal(result.bridgedRelation, 'Lean4Lean.VEnv.WF');
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'example', 'opaque']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA21.translated_theorem_env_wf',
  'PSKernelKA21.translated_example_env_wf',
  'PSKernelKA21.translated_opaque_env_wf',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 22);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefEnvWFBridgeChecked: result.directLean4LeanNonDefEnvWFBridgeChecked }, null, 2));
