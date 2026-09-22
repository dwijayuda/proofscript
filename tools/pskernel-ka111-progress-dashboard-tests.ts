#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka111-progress-dashboard.ts',
  'assurance/ka111/progress-dashboard-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA111ProgressDashboard } = await import('./pskernel-ka111-progress-dashboard.ts');
const result = runKA111ProgressDashboard({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka111-progress-dashboard0');
assert.equal(result.publicVersion, '1.0.0-pskernel.114');
assert.equal(result.baseline, 'proofscript-v1-ka110-feature-surface-closeout-audit0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 87);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 81);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka111/KA111_PROGRESS_DASHBOARD_RELEASE_GATE.json',
  'assurance/ka111/KA111_PROGRESS_DASHBOARD_VERIFICATION_SUMMARY.json',
  'assurance/ka111/KA111_PROGRESS_DASHBOARD.json',
  'assurance/ka111/KA111_PROGRESS_DASHBOARD_REPORT.md',
  'assurance/ka111/KA111_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka111/KA111_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
