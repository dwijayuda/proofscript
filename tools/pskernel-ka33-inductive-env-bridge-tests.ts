#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA33InductiveEnvBridgeGate } from './pskernel-ka33-inductive-env-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka33-inductive-env-bridge.ts',
  'tools/pskernel-ka33-inductive-env-bridge-tests.ts',
  'assurance/ka33/inductive-env-bridge.lean',
  'assurance/ka33/inductive-env-bridge.json',
  'assurance/ka33/obligation-delta.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka33-inductive-env-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA33InductiveEnvBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka33/KA33_RELEASE_GATE.json',
  'assurance/ka33/KA33_REPORT.md',
  'assurance/ka33/KA33_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka33-inductive-env-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.36');
assert.equal(result.baseline, 'proofscript-v1-ka32-feature-equivalence-audit0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-inductive-env-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictInductiveEnvBridgePassed, true);
assert.deepEqual(result.coveredPSDeclKinds, ['inductive']);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA33.translated_inductive_is_real_vdecl',
  'PSKernelKA33.translated_inductive_vdecl_wf',
  'PSKernelKA33.translated_inductive_env_wf',
  'PSKernelKA33.translated_inductive_env_ordered',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.inductiveSemanticSoundness, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 60);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));
