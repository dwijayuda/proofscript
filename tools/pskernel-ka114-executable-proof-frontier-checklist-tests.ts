#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka114-executable-proof-frontier-checklist.ts',
  'assurance/ka114/executable-proof-frontier-checklist-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA114ExecutableProofFrontierChecklist } = await import('./pskernel-ka114-executable-proof-frontier-checklist.ts');
const result = runKA114ExecutableProofFrontierChecklist({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka114-executable-proof-frontier-checklist0');
assert.equal(result.publicVersion, '1.0.0-pskernel.117');
assert.equal(result.baseline, 'proofscript-v1-ka113-executable-obligation-ledger0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 90);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 89);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 82.0);
assert.equal(result.frontierChecklist.checklistPercent, 100);
assert.equal(result.frontierChecklist.counts.done, result.frontierChecklist.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-frontier-checklisted');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka114/KA114_EXECUTABLE_PROOF_FRONTIER_CHECKLIST_RELEASE_GATE.json',
  'assurance/ka114/KA114_EXECUTABLE_PROOF_FRONTIER_CHECKLIST_VERIFICATION_SUMMARY.json',
  'assurance/ka114/KA114_EXECUTABLE_PROOF_FRONTIER_CHECKLIST.json',
  'assurance/ka114/KA114_EXECUTABLE_PROOF_FRONTIER_CHECKLIST_REPORT.md',
  'assurance/ka114/KA114_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka114/KA114_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
