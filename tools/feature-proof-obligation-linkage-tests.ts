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
const ledgerPath = path.join(root, 'config', 'proof-obligations-ledger.json');

function run(args = []) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const ok = run([]);
assert.equal(ok.status, 0, `feature promotion checker should pass with proof-obligation linkage\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /feature promotion gate holds/);
assert.match(ok.stdout, /proofObligationLinkedFeatures/);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerIds = new Set(ledger.obligations.map((obligation) => obligation.id));

for (const feature of manifest.features) {
  assert.ok(Array.isArray(feature.proofObligationIds), `${feature.id} should list proofObligationIds`);
  assert.ok(feature.proofObligationIds.includes('feature-proof-obligation-coverage'), `${feature.id} should include feature-proof-obligation-coverage`);
  for (const id of feature.proofObligationIds) assert.ok(ledgerIds.has(id), `${feature.id} references unknown proof obligation ${id}`);
  if (feature.executable !== false) {
    assert.ok(feature.proofObligationIds.includes('backend-semantic-preservation'), `${feature.id} executable feature should link backend-semantic-preservation`);
    assert.ok(feature.proofObligationIds.includes('runtime-observable-semantics'), `${feature.id} executable feature should link runtime-observable-semantics`);
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-feature-obligation-linkage-'));

const missingLinkPath = path.join(tempDir, 'missing-links.json');
const missingLink = structuredClone(manifest);
delete missingLink.features[0].proofObligationIds;
fs.writeFileSync(missingLinkPath, `${JSON.stringify(missingLink, null, 2)}\n`);
const missingLinkResult = run(['--manifest', missingLinkPath]);
assert.notEqual(missingLinkResult.status, 0, 'checker should reject supported features without proofObligationIds');
assert.match(`${missingLinkResult.stdout}\n${missingLinkResult.stderr}`, /proofObligationIds must be a non-empty array/i);

const badIdPath = path.join(tempDir, 'bad-id.json');
const badId = structuredClone(manifest);
badId.features[0].proofObligationIds.push('fake-formal-proof-obligation');
fs.writeFileSync(badIdPath, `${JSON.stringify(badId, null, 2)}\n`);
const badIdResult = run(['--manifest', badIdPath]);
assert.notEqual(badIdResult.status, 0, 'checker should reject proofObligationIds not present in the ledger');
assert.match(`${badIdResult.stdout}\n${badIdResult.stderr}`, /unknown proof obligation fake-formal-proof-obligation/i);

const missingRuntimePath = path.join(tempDir, 'missing-runtime.json');
const missingRuntime = structuredClone(manifest);
missingRuntime.features[0].proofObligationIds = missingRuntime.features[0].proofObligationIds.filter((id) => id !== 'runtime-observable-semantics');
fs.writeFileSync(missingRuntimePath, `${JSON.stringify(missingRuntime, null, 2)}\n`);
const missingRuntimeResult = run(['--manifest', missingRuntimePath]);
assert.notEqual(missingRuntimeResult.status, 0, 'checker should reject executable features without runtime-observable-semantics');
assert.match(`${missingRuntimeResult.stdout}\n${missingRuntimeResult.stderr}`, /executable features must link runtime-observable-semantics/i);

const missingBootstrapPath = path.join(tempDir, 'missing-bootstrap.json');
const missingBootstrap = structuredClone(manifest);
missingBootstrap.features[0].proofObligationIds = missingBootstrap.features[0].proofObligationIds.filter((id) => id !== 'stdlib-bootstrap-soundness');
fs.writeFileSync(missingBootstrapPath, `${JSON.stringify(missingBootstrap, null, 2)}\n`);
const missingBootstrapResult = run(['--manifest', missingBootstrapPath]);
assert.notEqual(missingBootstrapResult.status, 0, 'checker should reject checked-bootstrap features without stdlib-bootstrap-soundness');
assert.match(`${missingBootstrapResult.stdout}\n${missingBootstrapResult.stderr}`, /checked-bootstrap features must link stdlib-bootstrap-soundness/i);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('✓ feature proof-obligation linkage tests passed');
