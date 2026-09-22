#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA49CheckerPipelineEndToEndTheoremSkeletonGate } from './pskernel-ka49-checker-pipeline-end-to-end-theorem-skeleton.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const result = runKA49CheckerPipelineEndToEndTheoremSkeletonGate({ strict: false, writeReports: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka49-checker-pipeline-end-to-end-theorem-skeleton-preflight0');
assert.equal(result.publicVersion, '1.0.0-pskernel.52');
assert.equal(result.baseline, 'proofscript-v1-ka48-executable-whnf-defeq-refinement-preflight0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.referenceKind, 'source-bound-lean4lean-checker-pipeline-end-to-end-theorem-skeleton-preflight');
assert.equal(result.actualLean4LeanImportBound, false);
assert.equal(result.strictCheckerPipelineBridgePassed, false);
assert.ok(result.blockedReasons.includes('batteries_4_33_0_rc2_archive_missing') || result.blockedReasons.includes('external_dependency_fetch_failed_or_dependency_unavailable'));
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.newTrustedComputationRule, false);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.endToEndCheckerPipelineTheorem, false);
assert.equal(result.claimBoundary.formalLean4LeanBridgeObligations, 132);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 71);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 36);
assert.equal(result.featureEquivalenceProgress.formalLean4LeanBridgeObligations, 132);
for (const rel of [
  'assurance/ka49/KA49_CHECKER_PIPELINE_END_TO_END_THEOREM_SKELETON_RELEASE_GATE.json',
  'assurance/ka49/KA49_CHECKER_PIPELINE_END_TO_END_THEOREM_SKELETON_REPORT.md',
  'assurance/ka49/KA49_CHECKER_PIPELINE_END_TO_END_THEOREM_SKELETON_VERIFICATION_SUMMARY.json',
  'assurance/ka49/KA49_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka49/checker-pipeline-end-to-end-theorem-skeleton-bridge.json',
  'assurance/ka49/checker-pipeline-end-to-end-theorem-skeleton.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, formalObligations: result.claimBoundary.formalLean4LeanBridgeObligations, formalLeanCheckStatus: result.formalLeanCheckStatus }, null, 2));
