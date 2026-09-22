#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka128-lean4331-kernel-parity-scope-matrix.ts',
  'assurance/ka128/lean4331-kernel-parity-scope-matrix-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA128Lean4331KernelParityScopeMatrix } = await import('./pskernel-ka128-lean4331-kernel-parity-scope-matrix.ts');
const result = runKA128Lean4331KernelParityScopeMatrix({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka128-lean4331-kernel-parity-scope-matrix0');
assert.equal(result.publicVersion, '1.0.0-pskernel.131');
assert.equal(result.baseline, 'proofscript-v1-ka127-executable-refinement-proof-carrying-artifact0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 100);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 85.0);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.parityScope.targetLeanVersion, 'Lean 4.33.1');
assert.equal(result.parityScope.targetLayer, 'kernel-only');
assert.equal(result.parityScope.explicitlyNotTargeting.fullElaborator, true);
assert.equal(result.parityScope.explicitlyNotTargeting.tactics, true);
assert.equal(result.parityScope.explicitlyNotTargeting.macros, true);
assert.equal(result.parityScope.explicitlyNotTargeting.compilerRuntime, true);
assert.ok(result.featureMatrix.rows.length >= 19);
assert.equal(result.featureMatrix.matrixKind, 'lean4331-kernel-parity-scope');
assert.equal(result.featureMatrix.rows.every((row: any) => row.lean4ParityProofStatus === 'unproven'), true);
assert.equal(result.featureMatrix.rows.some((row: any) => row.featureId === 'definitional-equality'), true);
assert.equal(result.featureMatrix.rows.some((row: any) => row.featureId === 'quotients'), true);
assert.equal(result.featureMatrix.rows.some((row: any) => row.featureId === 'inductives-recursor'), true);
assert.equal(result.gapReport.remainingFullLean4EquivalenceGapPercent, 100);
assert.equal(result.gapReport.nextMilestone, 'KA-129 Lean4/Lean4Lean/PSKernel conformance corpus');
assert.equal(result.leanMarker.status, 'passed');
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executableDashboardStillClosed, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka128/PSKERNEL_LEAN4331_PARITY_SCOPE.md',
  'assurance/ka128/PSKERNEL_LEAN4331_FEATURE_MATRIX.json',
  'assurance/ka128/PSKERNEL_LEAN4331_GAP_REPORT.md',
  'assurance/ka128/PSKERNEL_LEAN4331_NEXT_PROOF_PLAN.md',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX_REPORT.md',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX.json',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX_ROWS.json',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX_RELEASE_GATE.json',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX_VERIFICATION_SUMMARY.json',
  'assurance/ka128/KA128_LEAN4331_KERNEL_PARITY_SCOPE_MATRIX_BRIDGE_SPEC.json',
  'assurance/ka128/KA128_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka128/KA128_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, features: result.featureMatrix.rows.length, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, fullLean4Equivalence: result.metrics.fullLean4EquivalencePercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
