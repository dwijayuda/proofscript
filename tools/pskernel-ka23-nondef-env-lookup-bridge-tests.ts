#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA23NonDefEnvLookupBridgeGate } from './pskernel-ka23-nondef-env-lookup-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka23/nondef-env-lookup-bridge.lean',
  'assurance/ka23/nondef-env-lookup-bridge.json',
  'assurance/ka23/obligation-delta.json',
  'assurance/ka23/KA23_RELEASE_GATE.json',
  'assurance/ka23/KA23_REPORT.md',
  'tools/pskernel-ka23-nondef-env-lookup-bridge.ts',
  'tools/pskernel-ka23-nondef-env-lookup-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-18-pskernel-ka23-nondef-env-lookup-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA23NonDefEnvLookupBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka23-nondef-env-lookup-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.26');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka22-nondef-env-extension-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanNonDefEnvLookupBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.equal(result.bridgedRelation, 'Lean4Lean.VEnv.constants / Lean4Lean.VEnv.defeqs');
assert.deepEqual(result.coveredPSDeclKinds, ['theorem', 'opaque']);
assert.deepEqual(result.nonAddingPSDeclKinds, ['example']);
assert.deepEqual(result.alreadyCoveredPSDeclKinds, ['axiom', 'definition']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA23.translated_theorem_env_lookup',
  'PSKernelKA23.translated_theorem_env_defeq_member',
  'PSKernelKA23.translated_opaque_env_lookup',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 28);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanNonDefEnvLookupBridgeChecked: result.directLean4LeanNonDefEnvLookupBridgeChecked }, null, 2));
