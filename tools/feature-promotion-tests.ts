#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'tools', 'check-feature-promotion.ts');
const manifestPath = path.join(root, 'config', 'feature-promotion-gate.json');
const docPath = path.join(root, 'docs', 'PRODUCTION_FEATURE_PROMOTION_GATE.md');

function run(args = []) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const ok = run([]);
assert.equal(ok.status, 0, `feature promotion checker should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /feature promotion gate holds/);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.trustClaim.label, 'K3-TB trusted-boundary');
assert.equal(manifest.trustClaim.fullyFormalK3, false);
assert.equal(manifest.trustClaim.lean4Equivalent, false);
assert.equal(manifest.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(manifest.requiredEvidence.supportedFeatureChecklist.length >= 7);
assert.ok(manifest.requiredEvidence.requiredProofObligations.supportedProductionFeature.includes('feature-proof-obligation-coverage'));
assert.ok(manifest.requiredEvidence.requiredProofObligations.executableFeature.includes('runtime-observable-semantics'));
assert.ok(manifest.features.length >= 8);

const byId = new Map(manifest.features.map((feature) => [feature.id, feature]));
for (const id of [
  'psc1-nat-subtraction',
  'psc1-nat-boolean-comparison',
  'psc1-bool-primitives',
  'psc1-structures',
  'psc1-user-inductives',
  'psc1-core-proof-steps',
]) {
  assert.ok(byId.has(id), `manifest should classify promoted feature ${id}`);
}
assert.equal(byId.get('psc1-nat-subtraction').kernelImpact, 'checked-bootstrap-only');
assert.equal(byId.get('psc1-core-proof-steps').executable, false);
assert.ok(byId.get('psc1-bool-primitives').evidence.negativeFailClosedSmoke.includes('tools/pslive-bool-primitive-tests.ts'));
assert.ok(byId.get('psc1-bool-primitives').proofObligationIds.includes('stdlib-bootstrap-soundness'));
assert.ok(byId.get('psc1-structures').proofObligationIds.includes('kernel-lean4-equivalence'));

const doc = fs.readFileSync(docPath, 'utf8');
assert.match(doc, /Production Feature Gate/);
assert.match(doc, /Required Evidence/);
assert.match(doc, /How to Add a Feature/);
assert.match(doc, /K3-TB/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-feature-promotion-'));
const missingNegativePath = path.join(tempDir, 'missing-negative.json');
const missingNegative = structuredClone(manifest);
missingNegative.features[0].evidence.negativeFailClosedSmoke = [];
fs.writeFileSync(missingNegativePath, `${JSON.stringify(missingNegative, null, 2)}\n`);
const rejectedMissingNegative = run(['--manifest', missingNegativePath]);
assert.notEqual(rejectedMissingNegative.status, 0, 'checker should reject supported features without negative tests');
assert.match(`${rejectedMissingNegative.stdout}\n${rejectedMissingNegative.stderr}`, /negativeFailClosedSmoke.*must not be empty/i);

const badPackagePath = path.join(tempDir, 'bad-package.json');
const badPackage = structuredClone(manifest);
badPackage.features[0].packages.push('packages/frontend-next');
fs.writeFileSync(badPackagePath, `${JSON.stringify(badPackage, null, 2)}\n`);
const rejectedExperimentalPackage = run(['--manifest', badPackagePath]);
assert.notEqual(rejectedExperimentalPackage.status, 0, 'checker should reject experimental packages in supported production feature path');
assert.match(`${rejectedExperimentalPackage.stdout}\n${rejectedExperimentalPackage.stderr}`, /experimental package packages\/frontend-next/i);

const badScriptPath = path.join(tempDir, 'bad-script.json');
const badScript = structuredClone(manifest);
badScript.features[0].evidence.packageScripts.push('test:missing-feature-script');
fs.writeFileSync(badScriptPath, `${JSON.stringify(badScript, null, 2)}\n`);
const rejectedMissingScript = run(['--manifest', badScriptPath]);
assert.notEqual(rejectedMissingScript.status, 0, 'checker should reject missing package scripts');
assert.match(`${rejectedMissingScript.stdout}\n${rejectedMissingScript.stderr}`, /missing package script test:missing-feature-script/i);

const badTrustClaimPath = path.join(tempDir, 'bad-trust.json');
const badTrustClaim = structuredClone(manifest);
badTrustClaim.trustClaim.lean4Equivalent = true;
fs.writeFileSync(badTrustClaimPath, `${JSON.stringify(badTrustClaim, null, 2)}\n`);
const rejectedTrustClaim = run(['--manifest', badTrustClaimPath]);
assert.notEqual(rejectedTrustClaim.status, 0, 'checker should reject upgraded Lean-equivalence claims');
assert.match(`${rejectedTrustClaim.stdout}\n${rejectedTrustClaim.stderr}`, /must not mark lean4Equivalent true/i);

console.log('✓ feature promotion tests passed');
