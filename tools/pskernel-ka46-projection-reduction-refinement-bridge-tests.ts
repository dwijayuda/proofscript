#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA46ProjectionReductionRefinementBridgeGate } from './pskernel-ka46-projection-reduction-refinement-bridge.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const required = [
  'tools/pskernel-ka46-projection-reduction-refinement-bridge.ts',
  'tools/pskernel-ka46-projection-reduction-refinement-bridge-tests.ts',
  'assurance/ka46/projection-reduction-refinement-bridge.lean',
  'assurance/ka46/projection-reduction-refinement-bridge.json',
  'assurance/ka46/obligation-delta.json',
  'assurance/ka46/kernel-feature-equivalence-progress.json',
  'docs/superpowers/plans/2026-09-19-pskernel-ka46-projection-reduction-refinement-bridge.md',
];
for (const rel of required) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA46ProjectionReductionRefinementBridgeGate({ strict: false, soft: true });
for (const rel of [
  'assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_RELEASE_GATE.json',
  'assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_REPORT.md',
  'assurance/ka46/KA46_PROJECTION_REDUCTION_REFINEMENT_BRIDGE_VERIFICATION_SUMMARY.json',
  'assurance/ka46/KA46_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

assert.equal(result.checkpoint, 'proofscript-v1-ka46-projection-reduction-refinement-preflight0');
assert.equal(result.publicVersion, '1.0.0-pskernel.49');
assert.equal(result.baseline, 'proofscript-v1-ka45-inductive-recursor-refinement-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'source-bound-lean4lean-projection-reduction-refinement-preflight');
assert.equal(result.actualLean4LeanImportBound, false);
assert.equal(result.strictProjectionReductionBridgePassed, false);
assert.ok(result.blockedReasons.includes('batteries_4_33_0_rc2_archive_missing') || result.blockedReasons.includes('external_dependency_fetch_failed_or_dependency_unavailable'));
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.deepEqual(result.coveredLean4LeanProjectionSurface, [
  'TypeChecker.Inner.reduceProjCore.WF',
  'TypeChecker.Inner.reduceProj.WF',
  "TypeChecker.Inner.whnfCore'.WF projection path",
  'TypeChecker.Inner.inferProj.WF',
]);
assert.deepEqual(result.intendedFormalBridgeLemmas, [
  'Lean4Lean.PSKernelKA46.translated_reduceProjCore_wf',
  'Lean4Lean.PSKernelKA46.translated_reduceProj_wf',
  'Lean4Lean.PSKernelKA46.translated_whnfCore_projection_path_wf',
  'Lean4Lean.PSKernelKA46.translated_inferProj_wf',
]);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.fullProjectionReductionRefinement, false);
assert.equal(result.claimBoundary.formalLean4LeanBridgeObligations, 132);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 68);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 34);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4LeanBridgeObligations, formalLeanCheckStatus: result.formalLeanCheckStatus }, null, 2));
