#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA26QuotEnvBridgeGate } from './pskernel-ka26-quot-env-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'assurance/ka26/quot-env-bridge.lean',
  'assurance/ka26/quot-env-bridge.json',
  'assurance/ka26/obligation-delta.json',
  'assurance/ka26/KA26_RELEASE_GATE.json',
  'assurance/ka26/KA26_REPORT.md',
  'tools/pskernel-ka26-quot-env-bridge.ts',
  'tools/pskernel-ka26-quot-env-bridge-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka26-quot-env-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA26QuotEnvBridgeGate({ strict: true });
assert.equal(result.checkpoint, 'proofscript-v1-ka26-quot-env-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.29');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.baseline, 'proofscript-v1-ka25-nondef-env-defeq-preservation-bridge0');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.directLean4LeanQuotEnvBridgeChecked, true);
assert.equal(result.strictBridgeCheckPassed, true);
assert.deepEqual(result.blockedReasons, []);
assert.deepEqual(result.bridgedRelations, [
  'Lean4Lean.VDecl.WF',
  'Lean4Lean.VEnv.WF',
  'Lean4Lean.VEnv.LE',
  'Lean4Lean.VEnv.addQuot',
  'Lean4Lean.VEnv.constants',
  'Lean4Lean.VEnv.defeqs',
]);
assert.deepEqual(result.coveredPSDeclKinds, ['quot']);
assert.deepEqual(result.provenLeanTheoremObligations, [
  'PSKernelKA26.translated_quot_vdecl_wf',
  'PSKernelKA26.translated_quot_env_wf',
  'PSKernelKA26.translated_quot_env_extends',
  'PSKernelKA26.translated_quot_env_lookup_quot',
  'PSKernelKA26.translated_quot_env_lookup_quot_mk',
  'PSKernelKA26.translated_quot_env_lookup_quot_lift',
  'PSKernelKA26.translated_quot_env_lookup_quot_ind',
  'PSKernelKA26.translated_quot_env_defeq_member',
]);
assert.equal(result.trustedKernelSemanticChange, false);
assert.equal(result.kernelCodecChange, false);
assert.equal(result.newTrustedComputationRule, false);
assert.equal(result.fullLean4Equivalence, false);
assert.equal(result.sameTheoryAsFullLean4, false);
assert.equal(result.fullyFormalK3, false);
assert.equal(result.formalLean4EquivalenceProvenObligations, 43);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, directLean4LeanQuotEnvBridgeChecked: result.directLean4LeanQuotEnvBridgeChecked }, null, 2));
