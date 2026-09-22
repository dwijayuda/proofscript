#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka117-executable-proof-module-index.ts',
  'assurance/ka117/executable-proof-module-index-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA117ExecutableProofModuleIndex } = await import('./pskernel-ka117-executable-proof-module-index.ts');
const result = runKA117ExecutableProofModuleIndex({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka117-executable-proof-module-index0');
assert.equal(result.publicVersion, '1.0.0-pskernel.120');
assert.equal(result.baseline, 'proofscript-v1-ka116-executable-proof-dependency-closure0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 93);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 92);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 82.9);
assert.equal(result.proofModuleIndex.indexPercent, 100);
assert.equal(result.proofModuleIndex.counts.indexed, result.proofModuleIndex.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-proof-module-indexed');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka117/KA117_EXECUTABLE_PROOF_MODULE_INDEX_RELEASE_GATE.json',
  'assurance/ka117/KA117_EXECUTABLE_PROOF_MODULE_INDEX_VERIFICATION_SUMMARY.json',
  'assurance/ka117/KA117_EXECUTABLE_PROOF_MODULE_INDEX.json',
  'assurance/ka117/KA117_EXECUTABLE_PROOF_MODULE_INDEX_REPORT.md',
  'assurance/ka117/KA117_EXECUTABLE_PROOF_MODULE_INDEX_ROWS.json',
  'assurance/ka117/KA117_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka117/KA117_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
