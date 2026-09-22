#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka115-executable-refinement-theorem-skeleton.ts',
  'assurance/ka115/executable-refinement-theorem-skeleton-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA115ExecutableRefinementTheoremSkeleton } = await import('./pskernel-ka115-executable-refinement-theorem-skeleton.ts');
const result = runKA115ExecutableRefinementTheoremSkeleton({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka115-executable-refinement-theorem-skeleton0');
assert.equal(result.publicVersion, '1.0.0-pskernel.118');
assert.equal(result.baseline, 'proofscript-v1-ka114-executable-proof-frontier-checklist0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 91);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 90);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 82.3);
assert.equal(result.theoremSkeleton.skeletonPercent, 100);
assert.equal(result.theoremSkeleton.counts.done, result.theoremSkeleton.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-theorem-skeletonized');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka115/KA115_EXECUTABLE_REFINEMENT_THEOREM_SKELETON_RELEASE_GATE.json',
  'assurance/ka115/KA115_EXECUTABLE_REFINEMENT_THEOREM_SKELETON_VERIFICATION_SUMMARY.json',
  'assurance/ka115/KA115_EXECUTABLE_REFINEMENT_THEOREM_SKELETON.json',
  'assurance/ka115/KA115_EXECUTABLE_REFINEMENT_THEOREM_SKELETON_REPORT.md',
  'assurance/ka115/KA115_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka115/KA115_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
