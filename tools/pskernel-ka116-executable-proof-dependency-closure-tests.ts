#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka116-executable-proof-dependency-closure.ts',
  'assurance/ka116/executable-proof-dependency-closure-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA116ExecutableProofDependencyClosure } = await import('./pskernel-ka116-executable-proof-dependency-closure.ts');
const result = runKA116ExecutableProofDependencyClosure({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka116-executable-proof-dependency-closure0');
assert.equal(result.publicVersion, '1.0.0-pskernel.119');
assert.equal(result.baseline, 'proofscript-v1-ka115-executable-refinement-theorem-skeleton0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 92);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 91);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 82.6);
assert.equal(result.proofDependencyClosure.closurePercent, 100);
assert.equal(result.proofDependencyClosure.counts.done, result.proofDependencyClosure.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-proof-dependency-closed');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka116/KA116_EXECUTABLE_PROOF_DEPENDENCY_CLOSURE_RELEASE_GATE.json',
  'assurance/ka116/KA116_EXECUTABLE_PROOF_DEPENDENCY_CLOSURE_VERIFICATION_SUMMARY.json',
  'assurance/ka116/KA116_EXECUTABLE_PROOF_DEPENDENCY_CLOSURE.json',
  'assurance/ka116/KA116_EXECUTABLE_PROOF_DEPENDENCY_CLOSURE_REPORT.md',
  'assurance/ka116/KA116_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka116/KA116_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
