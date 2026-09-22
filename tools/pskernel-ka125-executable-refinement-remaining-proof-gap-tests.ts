#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka125-executable-refinement-remaining-proof-gap.ts',
  'assurance/ka125/executable-refinement-remaining-proof-gap-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA125ExecutableRefinementRemainingProofGap } = await import('./pskernel-ka125-executable-refinement-remaining-proof-gap.ts');
const result = runKA125ExecutableRefinementRemainingProofGap({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka125-executable-refinement-remaining-proof-gap0');
assert.equal(result.publicVersion, '1.0.0-pskernel.128');
assert.equal(result.baseline, 'proofscript-v1-ka124-executable-refinement-proof-boundary-gate0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 99);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 99);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 0);
assert.equal(result.metrics.executableKernelEquivalenceRemainingGapPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 84.7);
assert.equal(result.remainingProofGap.gapPercent, 1);
assert.equal(result.remainingProofGap.gatePercent, 100);
assert.equal(result.remainingProofGap.counts.ready, result.remainingProofGap.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'blocked-at-remaining-proof-gap');
assert.equal(result.percentBoundaries.ka125DoesNotIncreaseExecutableProgressTo100, true);
assert.equal(result.percentBoundaries.remainingOnePercentRequiresTheoremDischarge, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP_RELEASE_GATE.json',
  'assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP_VERIFICATION_SUMMARY.json',
  'assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP.json',
  'assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP_REPORT.md',
  'assurance/ka125/KA125_EXECUTABLE_REFINEMENT_REMAINING_PROOF_GAP_ROWS.json',
  'assurance/ka125/KA125_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka125/KA125_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, gap: result.remainingProofGap.gapPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
