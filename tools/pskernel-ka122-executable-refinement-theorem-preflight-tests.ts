#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka122-executable-refinement-theorem-preflight.ts',
  'assurance/ka122/executable-refinement-theorem-preflight-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA122ExecutableRefinementTheoremPreflight } = await import('./pskernel-ka122-executable-refinement-theorem-preflight.ts');
const result = runKA122ExecutableRefinementTheoremPreflight({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka122-executable-refinement-theorem-preflight0');
assert.equal(result.publicVersion, '1.0.0-pskernel.125');
assert.equal(result.baseline, 'proofscript-v1-ka121-executable-refinement-proof-contract0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 98);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 97);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 84.4);
assert.equal(result.theoremPreflight.preflightPercent, 100);
assert.equal(result.theoremPreflight.counts.ready, result.theoremPreflight.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-theorem-preflight-mapped');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka122/KA122_EXECUTABLE_REFINEMENT_THEOREM_PREFLIGHT_RELEASE_GATE.json',
  'assurance/ka122/KA122_EXECUTABLE_REFINEMENT_THEOREM_PREFLIGHT_VERIFICATION_SUMMARY.json',
  'assurance/ka122/KA122_EXECUTABLE_REFINEMENT_THEOREM_PREFLIGHT.json',
  'assurance/ka122/KA122_EXECUTABLE_REFINEMENT_THEOREM_PREFLIGHT_REPORT.md',
  'assurance/ka122/KA122_EXECUTABLE_REFINEMENT_THEOREM_PREFLIGHT_ROWS.json',
  'assurance/ka122/KA122_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka122/KA122_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
