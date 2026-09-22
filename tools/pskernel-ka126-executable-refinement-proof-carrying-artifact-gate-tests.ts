#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka126-executable-refinement-proof-carrying-artifact-gate.ts',
  'assurance/ka126/executable-refinement-proof-carrying-artifact-gate-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA126ExecutableRefinementProofCarryingArtifactGate } = await import('./pskernel-ka126-executable-refinement-proof-carrying-artifact-gate.ts');
const result = runKA126ExecutableRefinementProofCarryingArtifactGate({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka126-executable-refinement-proof-carrying-artifact-gate0');
assert.equal(result.publicVersion, '1.0.0-pskernel.129');
assert.equal(result.baseline, 'proofscript-v1-ka125-executable-refinement-remaining-proof-gap0');
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
assert.equal(result.proofCarryingArtifactGate.gatePercent, 100);
assert.equal(result.proofCarryingArtifactGate.finalOnePercentLocked, true);
assert.equal(result.proofCarryingArtifactGate.requiresProofCarryingArtifactFor100Percent, true);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.executableEquivalence, 'blocked-until-proof-carrying-artifact');
assert.equal(result.percentBoundaries.ka126DoesNotIncreaseExecutableProgressTo100, true);
assert.equal(result.percentBoundaries.proofCarryingArtifactRequiredFor100Percent, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka126/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_RELEASE_GATE.json',
  'assurance/ka126/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_VERIFICATION_SUMMARY.json',
  'assurance/ka126/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE.json',
  'assurance/ka126/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_REPORT.md',
  'assurance/ka126/KA126_EXECUTABLE_REFINEMENT_PROOF_CARRYING_ARTIFACT_GATE_ROWS.json',
  'assurance/ka126/KA126_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka126/KA126_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, gap: result.metrics.executableKernelEquivalenceRemainingGapPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
