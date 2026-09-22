#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

const required = [
  'assurance/ka1/lean-4.33.1-kernel-inventory.json',
  'assurance/ka1/pscore-v71-spec.json',
  'assurance/ka1/proof-obligations.json',
  'assurance/ka1/gap-matrix.json',
  'assurance/ka1/translation-soundness-skeleton.lean',
  'assurance/ka1/KA1_REPORT.md'
];
for (const rel of required) assert.ok(exists(rel), `KA-1 missing required artifact: ${rel}`);

const pkg = readJson('package.json');
const versions = readJson('versions.json');
const status = readJson('kernel-status.json');
const inventory = readJson('assurance/ka1/lean-4.33.1-kernel-inventory.json');
const pscore = readJson('assurance/ka1/pscore-v71-spec.json');
const obligations = readJson('assurance/ka1/proof-obligations.json');
const gaps = readJson('assurance/ka1/gap-matrix.json');
const skeleton = read('assurance/ka1/translation-soundness-skeleton.lean');

assert.equal(versions.kernelImplementationName, 'PSKernel');
assert.match(pkg.version, /^1\.0\.0-pskernel\.\d+$/);
assert.equal(versions.implementation, pkg.version);
assert.equal(versions.defaultKernelCoreFormat, 71);
assert.equal(versions.fullLean4Equivalence, false);
assert.ok(versions.formalLean4EquivalenceProvenObligations >= 0);
assert.equal(status.auditBaseline.coreFormat, 71);
assert.equal(status.auditedK3TBChecklistComplete, true);

assert.equal(inventory.schema, 'proofscript.assurance.ka1.lean-kernel-inventory/v1');
assert.equal(inventory.status, 'inventory-only-not-equivalence-proof');
assert.equal(inventory.lean.version, '4.33.1');
assert.equal(inventory.pskernel.coreFormat, 71);
assert.ok(inventory.kernelInventory.length >= 12, 'inventory must cover at least 12 kernel concepts');
const ids = new Set(inventory.kernelInventory.map((x: any) => x.id));
for (const id of ['levels', 'expressions', 'environment', 'declarations', 'definitional-equality', 'quotients', 'inductive-admission', 'inductive-recursors', 'mutual-inductives', 'nested-inductives', 'prop-elimination', 'resource-bounds']) {
  assert.ok(ids.has(id), `inventory missing ${id}`);
}
for (const item of inventory.kernelInventory) {
  assert.ok(item.leanKernelConcept, `inventory item ${item.id} lacks Lean concept`);
  assert.ok(item.equivalenceObligation, `inventory item ${item.id} lacks equivalence obligation`);
}

assert.equal(pscore.schema, 'proofscript.assurance.ka1.pscore-v71-spec/v1');
assert.equal(pscore.core.formatVersion, 71);
assert.equal(pscore.trustBoundary.trustedKernelSemanticChange, false);
assert.equal(pscore.trustBoundary.fullLean4Equivalence, false);
for (const cls of ['trusted', 'checked', 'advisory', 'ignored', 'forbidden']) {
  assert.ok(pscore.artifactFieldClassification.some((x: any) => x.classification === cls), `missing ${cls} field classification`);
}

assert.equal(obligations.schema, 'proofscript.assurance.ka1.proof-obligations/v1');
assert.equal(obligations.summary.totalProvenObligations, 0);
const obligationIds = new Set(obligations.obligations.map((x: any) => x.id));
for (const id of ['soundness.checkDecl', 'soundness.defEq', 'soundness.replay', 'completeness.supportedCore']) {
  assert.ok(obligationIds.has(id), `missing obligation ${id}`);
}

assert.equal(gaps.schema, 'proofscript.assurance.ka1.gap-matrix/v1');
assert.ok(gaps.gaps.some((x: any) => x.id === 'formal-soundness-proof'));
assert.ok(gaps.gaps.some((x: any) => x.id === 'full-lean-input-parity'));
assert.ok(gaps.gaps.every((x: any) => x.closureCriterion), 'all gaps need closure criteria');

assert.match(skeleton, /namespace PSKernelKA1/);
assert.match(skeleton, /target_checkDecl_sound/);
assert.match(skeleton, /target_defEq_sound/);
assert.match(skeleton, /target_supportedCore_complete/);
assert.doesNotMatch(skeleton, /sorry/);

console.log(JSON.stringify({
  status: 'passed',
  checkpoint: 'proofscript-v1-ka1-lean4331-inventory0',
  publicVersion: versions.implementation,
  coreFormat: 71,
  trustedKernelSemanticChange: false,
  fullLean4Equivalence: false,
  formalLean4EquivalenceProvenObligations: 0,
  inventoryItems: inventory.kernelInventory.length,
  obligations: obligations.obligations.length,
  gaps: gaps.gaps.length
}, null, 2));
