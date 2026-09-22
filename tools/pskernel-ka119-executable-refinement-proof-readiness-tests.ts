#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka119-executable-refinement-proof-readiness.ts',
  'assurance/ka119/executable-refinement-proof-readiness-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA119ExecutableRefinementProofReadiness } = await import('./pskernel-ka119-executable-refinement-proof-readiness.ts');
const result = runKA119ExecutableRefinementProofReadiness({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka119-executable-refinement-proof-readiness0');
assert.equal(result.publicVersion, '1.0.0-pskernel.122');
assert.equal(result.baseline, 'proofscript-v1-ka118-executable-refinement-coverage-map0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 95);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 94);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 83.5);
assert.equal(result.proofReadiness.readinessPercent, 100);
assert.equal(result.proofReadiness.counts.ready, result.proofReadiness.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-proof-readiness-mapped');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka119/KA119_EXECUTABLE_REFINEMENT_PROOF_READINESS_RELEASE_GATE.json',
  'assurance/ka119/KA119_EXECUTABLE_REFINEMENT_PROOF_READINESS_VERIFICATION_SUMMARY.json',
  'assurance/ka119/KA119_EXECUTABLE_REFINEMENT_PROOF_READINESS.json',
  'assurance/ka119/KA119_EXECUTABLE_REFINEMENT_PROOF_READINESS_REPORT.md',
  'assurance/ka119/KA119_EXECUTABLE_REFINEMENT_PROOF_READINESS_ROWS.json',
  'assurance/ka119/KA119_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka119/KA119_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
