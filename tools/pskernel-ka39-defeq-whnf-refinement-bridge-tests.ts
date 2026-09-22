#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA39DefEqWHNFRefinementBridgeGate } from './pskernel-ka39-defeq-whnf-refinement-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka39-defeq-whnf-refinement-bridge.ts',
  'tools/pskernel-ka39-defeq-whnf-refinement-bridge-tests.ts',
  'assurance/ka39/defeq-whnf-refinement-bridge.lean',
  'assurance/ka39/defeq-whnf-refinement-bridge.json',
  'assurance/ka39/obligation-delta.json',
  'assurance/ka39/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka39-defeq-whnf-refinement-bridge.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA39DefEqWHNFRefinementBridgeGate({ strict: true });

const generatedRequired = [
  'assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_RELEASE_GATE.json',
  'assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_REPORT.md',
  'assurance/ka39/KA39_DEFEQ_WHNF_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json',
  'assurance/ka39/KA39_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka39-defeq-whnf-refinement-bridge0');
assert.equal(result.publicVersion, '1.0.0-pskernel.42');
assert.equal(result.baseline, 'proofscript-v1-ka38-whnf-preservation-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'direct-imported-lean4lean-defeq-whnf-refinement-bridge');
assert.equal(result.actualLean4LeanImportBound, true);
assert.equal(result.strictDefEqWHNFBridgePassed, true);
assert.deepEqual(result.coveredLean4LeanDefEqSurface, [
  'IsDefEq.hasType',
  'IsDefEq.toU',
  'IsDefEqU.refl',
  'IsDefEqU.symm',
  'IsDefEq.mono',
  'IsDefEqU.mono',
  'HasType.mono',
]);
assert.deepEqual(result.formalBridgeLemmas, [
  'PSKernelKA39.translated_defeq_has_type_pair',
  'PSKernelKA39.translated_defeq_to_untyped',
  'PSKernelKA39.translated_defeq_untyped_refl',
  'PSKernelKA39.translated_defeq_untyped_symm',
  'PSKernelKA39.translated_defeq_mono_env',
  'PSKernelKA39.translated_defeq_untyped_mono_env',
  'PSKernelKA39.translated_has_type_mono_env',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullDefEqWHNFRefinement, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 103);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 56);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 25);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4EquivalenceProvenObligations, featureSurfaceBridgeProgressPercent: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent }, null, 2));
