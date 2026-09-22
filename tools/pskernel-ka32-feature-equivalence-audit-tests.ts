#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runKA32FeatureEquivalenceAuditGate } from './pskernel-ka32-feature-equivalence-audit.ts';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const preRequired = [
  'tools/pskernel-ka32-feature-equivalence-audit.ts',
  'tools/pskernel-ka32-feature-equivalence-audit-tests.ts',
  'docs/superpowers/plans/2026-09-19-pskernel-ka32-feature-equivalence-audit.md',
];
for (const rel of preRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);

const result = runKA32FeatureEquivalenceAuditGate({ strict: true });

const generatedRequired = [
  'assurance/ka32/lean4-pskernel-feature-parity-matrix.json',
  'assurance/ka32/LEAN4_PSKERNEL_FEATURE_PARITY_ANALYSIS.md',
  'assurance/ka32/KA32_RELEASE_GATE.json',
  'assurance/ka32/KA32_REPORT.md',
  'assurance/ka32/KA32_VERIFICATION_SUMMARY.json',
];
for (const rel of generatedRequired) assert.ok(fs.existsSync(path.join(root, rel)), `missing generated ${rel}`);
assert.equal(result.checkpoint, 'proofscript-v1-ka32-feature-equivalence-audit0');
assert.equal(result.publicVersion, '1.0.0-pskernel.35');
assert.equal(result.baseline, 'proofscript-v1-ka31-example-env-aggregate-bridge0');
assert.equal(result.coreFormat, 71);
assert.equal(result.certificateFormat, 2);
assert.equal(result.actualLean4LeanSourceAudited, true);
assert.equal(result.pskernelSourceAudited, true);
assert.equal(result.featureMatrixGenerated, true);
assert.equal(result.strictAuditPassed, true);
assert.equal(result.claimBoundary.fullLean4Equivalence, false);
assert.equal(result.claimBoundary.sameTheoryAsFullLean4, false);
assert.equal(result.claimBoundary.fullyFormalK3, false);
assert.equal(result.claimBoundary.executablePSKernelRefinementProof, false);
assert.equal(result.claimBoundary.formalLean4EquivalenceProvenObligations, 56);
assert.ok(result.matrixSummary.total >= 14);
assert.ok(result.matrixSummary.greenOrBridged >= 5);
assert.ok(result.matrixSummary.gaps >= 5);
assert.ok(result.requiredNextMilestones.includes('KA33-inductive-env-bridge'));
assert.ok(result.requiredNextMilestones.includes('KA34-mutual-def-env-bridge'));
assert.ok(result.requiredNextMilestones.includes('KA35-executable-typechecker-refinement'));
assert.ok(result.requiredNextMilestones.includes('KA36-full-expression-tag-coverage'));
assert.deepEqual(result.overclaimGuards, []);
console.log(JSON.stringify({ status: 'passed', checkpoint: result.checkpoint, matrixSummary: result.matrixSummary }, null, 2));
