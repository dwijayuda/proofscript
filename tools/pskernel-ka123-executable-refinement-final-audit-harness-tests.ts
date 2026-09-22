#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka123-executable-refinement-final-audit-harness.ts',
  'assurance/ka123/executable-refinement-final-audit-harness-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA123ExecutableRefinementFinalAuditHarness } = await import('./pskernel-ka123-executable-refinement-final-audit-harness.ts');
const result = runKA123ExecutableRefinementFinalAuditHarness({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka123-executable-refinement-final-audit-harness0');
assert.equal(result.publicVersion, '1.0.0-pskernel.126');
assert.equal(result.baseline, 'proofscript-v1-ka122-executable-refinement-theorem-preflight0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 99);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 98);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 84.7);
assert.equal(result.finalAuditHarness.harnessPercent, 100);
assert.equal(result.finalAuditHarness.counts.ready, result.finalAuditHarness.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-final-audit-harness-mapped');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka123/KA123_EXECUTABLE_REFINEMENT_FINAL_AUDIT_HARNESS_RELEASE_GATE.json',
  'assurance/ka123/KA123_EXECUTABLE_REFINEMENT_FINAL_AUDIT_HARNESS_VERIFICATION_SUMMARY.json',
  'assurance/ka123/KA123_EXECUTABLE_REFINEMENT_FINAL_AUDIT_HARNESS.json',
  'assurance/ka123/KA123_EXECUTABLE_REFINEMENT_FINAL_AUDIT_HARNESS_REPORT.md',
  'assurance/ka123/KA123_EXECUTABLE_REFINEMENT_FINAL_AUDIT_HARNESS_ROWS.json',
  'assurance/ka123/KA123_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka123/KA123_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
