#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka110-feature-surface-closeout-audit.ts',
  'assurance/ka110/feature-surface-closeout-audit-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA110FeatureSurfaceCloseoutAudit } = await import('./pskernel-ka110-feature-surface-closeout-audit.ts');
const result = runKA110FeatureSurfaceCloseoutAudit({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka110-feature-surface-closeout-audit0');
assert.equal(result.publicVersion, '1.0.0-pskernel.113');
assert.equal(result.baseline, 'proofscript-v1-ka109-primitive-condition-structural-helper-refinement0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.formalLean4LeanBridgeObligations, 366);
assert.equal(result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.featureEquivalenceProgress.executableKernelEquivalenceProofProgressPercent, 87);
assert.equal(result.featureEquivalenceProgress.notAFullLean4EquivalenceClaim, true);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.closeoutAudit.phaseCloseoutStatus, 'closed-for-ka-series-feature-surface-dashboard');
assert.equal(result.closeoutAudit.bridgeLeanFilesWithSorry.length, 0);
assert.equal(result.closeoutAudit.duplicateBridgeSpecGroups.length, 1);
assert.equal(result.closeoutAudit.duplicateBridgeSpecGroups[0].checkpoint, 'proofscript-v1-ka105-primitive-defeq-application-helper-refinement0');
assert.equal(result.closeoutAudit.canonicalBridgeSpecCount > 0, true);
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka110/KA110_FEATURE_SURFACE_CLOSEOUT_AUDIT_RELEASE_GATE.json',
  'assurance/ka110/KA110_FEATURE_SURFACE_CLOSEOUT_AUDIT_VERIFICATION_SUMMARY.json',
  'assurance/ka110/KA110_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka110/KA110_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
  'assurance/ka110/KA110_FEATURE_SURFACE_CLOSEOUT_AUDIT_REPORT.md',
  'assurance/ka110/KA110_FEATURE_SURFACE_CLOSEOUT_AUDIT_MANIFEST.json',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, featureSurface: result.featureEquivalenceProgress.featureSurfaceBridgeProgressPercent}, null, 2));
