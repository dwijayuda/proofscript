#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka124-executable-refinement-proof-boundary-gate.ts',
  'assurance/ka124/executable-refinement-proof-boundary-gate-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA124ExecutableRefinementProofBoundaryGate } = await import('./pskernel-ka124-executable-refinement-proof-boundary-gate.ts');
const result = runKA124ExecutableRefinementProofBoundaryGate({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka124-executable-refinement-proof-boundary-gate0');
assert.equal(result.publicVersion, '1.0.0-pskernel.127');
assert.equal(result.baseline, 'proofscript-v1-ka123-executable-refinement-final-audit-harness0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 99);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 99);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 0);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 84.7);
assert.equal(result.proofBoundaryGate.gatePercent, 100);
assert.equal(result.proofBoundaryGate.counts.ready, result.proofBoundaryGate.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'blocked-at-proof-boundary');
assert.equal(result.percentBoundaries.ka124DoesNotIncreaseExecutableProgressTo100, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka124/KA124_EXECUTABLE_REFINEMENT_PROOF_BOUNDARY_GATE_RELEASE_GATE.json',
  'assurance/ka124/KA124_EXECUTABLE_REFINEMENT_PROOF_BOUNDARY_GATE_VERIFICATION_SUMMARY.json',
  'assurance/ka124/KA124_EXECUTABLE_REFINEMENT_PROOF_BOUNDARY_GATE.json',
  'assurance/ka124/KA124_EXECUTABLE_REFINEMENT_PROOF_BOUNDARY_GATE_REPORT.md',
  'assurance/ka124/KA124_EXECUTABLE_REFINEMENT_PROOF_BOUNDARY_GATE_ROWS.json',
  'assurance/ka124/KA124_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka124/KA124_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
