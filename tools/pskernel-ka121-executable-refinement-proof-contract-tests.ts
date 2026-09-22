#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka121-executable-refinement-proof-contract.ts',
  'assurance/ka121/executable-refinement-proof-contract-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA121ExecutableRefinementProofContract } = await import('./pskernel-ka121-executable-refinement-proof-contract.ts');
const result = runKA121ExecutableRefinementProofContract({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka121-executable-refinement-proof-contract0');
assert.equal(result.publicVersion, '1.0.0-pskernel.124');
assert.equal(result.baseline, 'proofscript-v1-ka120-executable-refinement-discharge-agenda0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 97);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 96);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 84.1);
assert.equal(result.proofContract.contractPercent, 100);
assert.equal(result.proofContract.counts.ready, result.proofContract.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-proof-contract-mapped');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka121/KA121_EXECUTABLE_REFINEMENT_PROOF_CONTRACT_RELEASE_GATE.json',
  'assurance/ka121/KA121_EXECUTABLE_REFINEMENT_PROOF_CONTRACT_VERIFICATION_SUMMARY.json',
  'assurance/ka121/KA121_EXECUTABLE_REFINEMENT_PROOF_CONTRACT.json',
  'assurance/ka121/KA121_EXECUTABLE_REFINEMENT_PROOF_CONTRACT_REPORT.md',
  'assurance/ka121/KA121_EXECUTABLE_REFINEMENT_PROOF_CONTRACT_ROWS.json',
  'assurance/ka121/KA121_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka121/KA121_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
