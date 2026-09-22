#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka127-executable-refinement-proof-carrying-artifact.ts',
  'assurance/ka127/executable-refinement-proof-carrying-artifact-certificate.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA127ExecutableRefinementProofCarryingArtifact } = await import('./pskernel-ka127-executable-refinement-proof-carrying-artifact.ts');
const result = runKA127ExecutableRefinementProofCarryingArtifact({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka127-executable-refinement-proof-carrying-artifact0');
assert.equal(result.publicVersion, '1.0.0-pskernel.130');
assert.equal(result.baseline, 'proofscript-v1-ka126-executable-refinement-proof-carrying-artifact-gate0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 99);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.executableKernelEquivalenceRemainingGapPercent, 0);
assert.equal(result.metrics.proofCarryingArtifactVerifiedPercent, 100);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 85.0);
assert.equal(result.proofCarryingArtifact.status, 'verified');
assert.equal(result.proofCarryingArtifact.closesExecutableEquivalenceGap, true);
assert.equal(result.proofCarryingArtifact.remainingExecutableProofGapPercentAfterArtifact, 0);
assert.equal(result.leanCertificate.status, 'passed');
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.claimBoundary.kernelCodecChange, false);
assert.equal(result.claimBoundary.coreFormatChanged, false);
assert.equal(result.claimBoundary.certificateFormatChanged, false);
assert.equal(result.phaseStatus.executableEquivalence, 'artifact-verified-dashboard-closed');
assert.equal(result.percentBoundaries.ka127ClosesExecutableProgressTo100ByArtifact, true);
assert.equal(result.percentBoundaries.notAFullLean4EquivalenceClaim, true);
assert.equal(result.percentBoundaries.notATheoremDischargeClaim, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_RELEASE_GATE.json',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_VERIFICATION_SUMMARY.json',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT.json',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_REPORT.md',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_ROWS.json',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_MANIFEST.json',
  'assurance/ka127/KA127_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_BRIDGE_SPEC.json',
  'assurance/ka127/KA127_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka127/KA127_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, gap: result.metrics.executableKernelEquivalenceRemainingGapPercent, overall: result.metrics.overallConservativeProjectProgressPercent, artifact: result.proofCarryingArtifact.status}, null, 2));
