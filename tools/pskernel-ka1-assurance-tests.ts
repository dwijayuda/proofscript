#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

const requiredFiles = [
  'assurance/ka1/lean-4.33.1-kernel-inventory.json',
  'assurance/ka1/pscore-v71-spec.json',
  'assurance/ka1/proof-obligations.json',
  'assurance/ka1/gap-matrix.json',
  'assurance/ka1/translation-soundness-skeleton.lean',
  'assurance/ka1/KA1_REPORT.md',
  'docs/superpowers/plans/2026-09-18-pskernel-ka1-lean4331-inventory.md',
  'tools/pskernel-ka1-assurance.ts'
];

for (const rel of requiredFiles) assert.ok(exists(rel), `missing ${rel}`);

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const versions = readJson('versions.json');
const kernelStatus = readJson('kernel-status.json');
const inventory = readJson('assurance/ka1/lean-4.33.1-kernel-inventory.json');
const pscore = readJson('assurance/ka1/pscore-v71-spec.json');
const obligations = readJson('assurance/ka1/proof-obligations.json');
const gaps = readJson('assurance/ka1/gap-matrix.json');
const skeleton = read('assurance/ka1/translation-soundness-skeleton.lean');
const report = read('assurance/ka1/KA1_REPORT.md');

assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(versions.implementation, pkg.version);
assert.equal(versions.proofscriptPublicVersion, pkg.version);
assert.match(versions.currentProductionSlice, /PSKernel v1/);
assert.match(versions.latestLocalLineageCheckpoint, /^proofscript-v1-/);
assert.equal(versions.fullLean4Equivalence, false);
assert.ok(versions.formalLean4EquivalenceProvenObligations >= 0);

assert.equal(kernelStatus.auditBaseline.coreFormat, 71);
assert.equal(kernelStatus.auditedK3TBChecklistComplete, true);
assert.equal(kernelStatus.fullLean4Equivalence, false);

assert.equal(inventory.schema, 'proofscript.assurance.ka1.lean-kernel-inventory/v1');
assert.equal(inventory.lean.version, '4.33.1');
assert.equal(inventory.status, 'inventory-only-not-equivalence-proof');
assert.ok(inventory.kernelInventory.length >= 12);
for (const item of inventory.kernelInventory) {
  assert.ok(item.id, 'inventory item must have id');
  assert.ok(['required','explicitly-excluded','adapter-normalized','out-of-scope'].includes(item.pskernelDisposition), `bad disposition ${item.id}`);
  assert.ok(item.equivalenceObligation, `missing equivalence obligation for ${item.id}`);
}
assert.ok(inventory.kernelInventory.some((x: any) => x.id === 'definitional-equality'));
assert.ok(inventory.kernelInventory.some((x: any) => x.id === 'inductive-recursors'));
assert.ok(inventory.kernelInventory.some((x: any) => x.id === 'quotients'));

assert.equal(pscore.schema, 'proofscript.assurance.ka1.pscore-v71-spec/v1');
assert.equal(pscore.core.formatVersion, 71);
assert.equal(pscore.core.implementationProfile, 'KERNEL-level-instantiation-conformance1');
assert.equal(pscore.trustBoundary.trustedKernelSemanticChange, false);
assert.ok(pscore.artifactFieldClassification.every((x: any) => ['trusted','checked','advisory','ignored','forbidden'].includes(x.classification)));
assert.ok(pscore.artifactFieldClassification.some((x: any) => x.classification === 'forbidden'));
assert.ok(pscore.artifactFieldClassification.some((x: any) => x.classification === 'checked'));

assert.equal(obligations.schema, 'proofscript.assurance.ka1.proof-obligations/v1');
assert.equal(obligations.summary.totalProvenObligations, 0);
assert.ok(obligations.obligations.length >= 10);
assert.ok(obligations.obligations.every((x: any) => ['open','planned','evidence-only','out-of-scope'].includes(x.status)));
assert.ok(obligations.obligations.some((x: any) => x.id === 'soundness.checkDecl'));
assert.ok(obligations.obligations.some((x: any) => x.id === 'soundness.defEq'));
assert.ok(obligations.obligations.some((x: any) => x.id === 'completeness.supportedCore'));

assert.equal(gaps.schema, 'proofscript.assurance.ka1.gap-matrix/v1');
assert.ok(gaps.gaps.length >= 8);
assert.ok(gaps.gaps.some((x: any) => x.id === 'formal-soundness-proof'));
assert.ok(gaps.gaps.some((x: any) => x.id === 'full-lean-input-parity'));
assert.ok(gaps.gaps.every((x: any) => ['critical','major','moderate','minor'].includes(x.severity)));

assert.match(skeleton, /namespace PSKernelKA1/);
assert.match(skeleton, /theorem target_checkDecl_sound/);
assert.match(skeleton, /theorem target_defEq_sound/);
assert.match(skeleton, /theorem target_supportedCore_complete/);
assert.match(skeleton, /not a proof/);
assert.doesNotMatch(skeleton, /sorry/);

assert.match(report, /KA-1/);
assert.match(report, /No trusted kernel semantics were changed/);
assert.match(report, /Full Lean 4 equivalence: NO/);

assert.ok(pkg.scripts['assurance:ka1']);
assert.ok(pkg.scripts['test:pskernel:ka1']);
console.log('PSKERNEL_KA1_ASSURANCE=PASS');
