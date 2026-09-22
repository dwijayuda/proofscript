#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA34MutualDefEnvBridgeGate } from './pskernel-ka34-mutual-def-env-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka34-mutual-def-env-bridge.ts',
  'tools/pskernel-ka34-mutual-def-env-bridge-tests.ts',
  'assurance/ka34/mutual-def-env-bridge.lean',
  'assurance/ka34/mutual-def-env-bridge.json',
  'assurance/ka34/obligation-delta.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka34-mutual-def-env-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA34MutualDefEnvBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka34/KA34_RELEASE_GATE.json',
  'assurance/ka34/KA34_REPORT.md',
  'assurance/ka34/KA34_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka34-mutual-def-env-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.37');
assert.equal(result.baseline, 'proofscript-v1-ka33-inductive-env-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-mutual-def-env-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictMutualDefEnvBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanDeclConstructors, ['VDecl.mutualDef']);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA34.translated_mutual_def_is_real_vdecl',
  'PSKernelKA34.translated_mutual_def_vdecl_wf',
  'PSKernelKA34.translated_mutual_def_env_wf',
  'PSKernelKA34.translated_mutual_def_env_ordered',
  'PSKernelKA34.translated_mutual_def_constants_member',
  'PSKernelKA34.translated_mutual_def_defeq_member',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.mutualDefinitionSemanticSoundness, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 66);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations }, null, 2));
