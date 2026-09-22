#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const rel of [
  'tools/pskernel-ka113-executable-obligation-ledger.ts',
  'assurance/ka113/executable-obligation-ledger-bridge.lean',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const { runKA113ExecutableObligationLedger } = await import('./pskernel-ka113-executable-obligation-ledger.ts');
const result = runKA113ExecutableObligationLedger({ writeReports: true, strict: true });

assert.equal(result.checkpoint, 'proofscript-v1-ka113-executable-obligation-ledger0');
assert.equal(result.publicVersion, '1.0.0-pskernel.116');
assert.equal(result.baseline, 'proofscript-v1-ka112-executable-equivalence-progress0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.metrics.featureSurfaceBridgeProgressPercent, 100);
assert.equal(result.metrics.executableKernelEquivalenceProofProgressPercent, 89);
assert.equal(result.metrics.formalLean4LeanBridgeObligations, 366);
assert.equal(result.metrics.fullLean4EquivalencePercent, 0);
assert.equal(result.metrics.fullyFormalK3Percent, 0);
assert.equal(result.metrics.overallConservativeProjectProgressPercent, 81.7);
assert.equal(result.ledgerSummary.executableObligationLedgerPercent, 100);
assert.equal(result.ledgerSummary.counts.closedOrTracked, result.ledgerSummary.counts.expected);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.trustedKernelSemanticChange, false);
assert.equal(result.phaseStatus.featureSurfaceBridge, 'closed');
assert.equal(result.phaseStatus.executableEquivalence, 'active-obligation-ledgered');
assert.equal(result.architectureHealth.antiSpaghettiGatePassed, true);
for (const rel of [
  'assurance/ka113/KA113_EXECUTABLE_OBLIGATION_LEDGER_RELEASE_GATE.json',
  'assurance/ka113/KA113_EXECUTABLE_OBLIGATION_LEDGER_VERIFICATION_SUMMARY.json',
  'assurance/ka113/KA113_EXECUTABLE_OBLIGATION_LEDGER.json',
  'assurance/ka113/KA113_EXECUTABLE_OBLIGATION_LEDGER_REPORT.md',
  'assurance/ka113/KA113_KERNEL_FEATURE_EQUIVALENCE_PROGRESS.json',
  'assurance/ka113/KA113_KERNEL_FEATURE_EQUIVALENCE_PROGRESS_REPORT.md',
]) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);

console.log(JSON.stringify({status:'passed', checkpoint: result.checkpoint, executable: result.metrics.executableKernelEquivalenceProofProgressPercent, overall: result.metrics.overallConservativeProjectProgressPercent}, null, 2));
