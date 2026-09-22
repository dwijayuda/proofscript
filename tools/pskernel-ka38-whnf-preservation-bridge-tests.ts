#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA38WHNFPreservationBridgeGate } from './pskernel-ka38-whnf-preservation-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka38-whnf-preservation-bridge.ts',
  'tools/pskernel-ka38-whnf-preservation-bridge-tests.ts',
  'assurance/ka38/whnf-preservation-bridge.lean',
  'assurance/ka38/whnf-preservation-bridge.json',
  'assurance/ka38/obligation-delta.json',
  'assurance/ka38/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka38-whnf-preservation-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA38WHNFPreservationBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka38/KA38_RELEASE_GATE.json',
  'assurance/ka38/KA38_REPORT.md',
  'assurance/ka38/KA38_VERIFICATION_SUMMARY.json',
  'assurance/ka38/KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka38-whnf-preservation-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.41');
assert.equal(result.baseline, 'proofscript-v1-ka37-whnf-head-reduction-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-whnf-preservation-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictWHNFPreservationBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanWHNFPreservationSurface, [
  'WHRed.determ',
  'WHRed.defeq',
  'WHRed.hasType',
  'WHRedS.defeq',
  'WHRedS.hasType',
  'WHNF.whRedS',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA38.translated_whred_single_step_deterministic',
  'PSKernelKA38.translated_whred_defeq_preservation',
  'PSKernelKA38.translated_whred_type_preservation',
  'PSKernelKA38.translated_whreds_defeq_preservation',
  'PSKernelKA38.translated_whreds_type_preservation',
  'PSKernelKA38.translated_whnf_whreds_fixed_point',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullWHNFRecursorRefinement, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 96);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 54);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 24);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations, featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent }, null, 2));
