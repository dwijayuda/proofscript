#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka120-executable-refinement-discharge-agenda.ts',
  'assurance/ka120/executable-refinement-discharge-agenda-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA120ExecutableRefinementDischargeAgenda } = await import('./pskernel-ka120-executable-refinement-discharge-agenda.ts');
const result = runKA120ExecutableRefinementDischargeAgenda({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka120-executable-refinement-discharge-agenda0');
assert.equal(result.publicVersion, '1.0.0-pskernel.123');
assert.equal(result.baseline, 'proofscript-v1-ka119-executable-refinement-proof-readiness0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 96);
assert.equal(result.metrics.executableKernelEquivalencePreviousPercent, 95);
assert.equal(result.metrics.executableKernelEquivalenceDeltaPercent, 1);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.newFormalLean4LeanBridgeObligations, 0);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 83.8);
assert.equal(result.dischargeAgenda.agendaPercent, 100);
assert.equal(result.dischargeAgenda.counts.ready, result.dischargeAgenda.counts.total);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-discharge-agenda-mapped');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka120/KA120_EXECUTABLE_REFINEMENT_DISCHARGE_AGENDA_RELEASE_GATE.json',
  'assurance/ka120/KA120_EXECUTABLE_REFINEMENT_DISCHARGE_AGENDA_VERIFICATION_SUMMARY.json',
  'assurance/ka120/KA120_EXECUTABLE_REFINEMENT_DISCHARGE_AGENDA.json',
  'assurance/ka120/KA120_EXECUTABLE_REFINEMENT_DISCHARGE_AGENDA_REPORT.md',
  'assurance/ka120/KA120_EXECUTABLE_REFINEMENT_DISCHARGE_AGENDA_ROWS.json',
  'assurance/ka120/KA120_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka120/KA120_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
