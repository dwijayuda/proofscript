#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'tools', 'check-production-traceability.ts');
const manifestPath = path.join(root, 'config', 'production-traceability-bundle.json');

function run(args = []) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const ok = run([]);
assert.equal(ok.status, 0, `production traceability checker should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /production traceability holds/);
assert.match(ok.stdout, /K3-TB trusted-boundary/);
assert.match(ok.stdout, /formalLean4EquivalenceProvenObligations.*0/s);

const json = run(['--json']);
assert.equal(json.status, 0, `production traceability checker JSON should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(parsed.release, manifest.release);
assert.equal(parsed.trustClaim.label, 'K3-TB trusted-boundary');
assert.equal(parsed.trustClaim.lean4Equivalent, false);
assert.equal(parsed.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(parsed.sources.checked >= 5);
assert.ok(parsed.links.canonicalPackagesDocumented >= 14);
assert.equal(parsed.links.proofLinkedFeatures, parsed.links.supportedFeatures);
assert.ok(parsed.links.verificationClaims >= 14);
assert.ok(parsed.requiredLinks.includes('features-to-proof-obligations'));
assert.ok(parsed.requiredLinks.includes('claims-to-commands'));

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-production-traceability-'));

const missingSourcePath = path.join(tempDir, 'missing-source.json');
const missingSource = structuredClone(manifest);
missingSource.sources.push('config/does-not-exist.json');
fs.writeFileSync(missingSourcePath, `${JSON.stringify(missingSource, null, 2)}\n`);
const missingSourceResult = run(['--manifest', missingSourcePath]);
assert.notEqual(missingSourceResult.status, 0, 'checker should reject missing source files');
assert.match(`${missingSourceResult.stdout}\n${missingSourceResult.stderr}`, /missing traceability source: config\/does-not-exist\.json/i);

const badTrustPath = path.join(tempDir, 'bad-trust.json');
const badTrust = structuredClone(manifest);
badTrust.trustClaim.lean4Equivalent = true;
fs.writeFileSync(badTrustPath, `${JSON.stringify(badTrust, null, 2)}\n`);
const badTrustResult = run(['--manifest', badTrustPath]);
assert.notEqual(badTrustResult.status, 0, 'checker should reject Lean-equivalence overclaims');
assert.match(`${badTrustResult.stdout}\n${badTrustResult.stderr}`, /must not mark lean4Equivalent true/i);

const missingClaimPath = path.join(tempDir, 'missing-claim.json');
const missingClaim = structuredClone(manifest);
missingClaim.requiredVerificationClaims.push('missing-verification-claim');
fs.writeFileSync(missingClaimPath, `${JSON.stringify(missingClaim, null, 2)}\n`);
const missingClaimResult = run(['--manifest', missingClaimPath]);
assert.notEqual(missingClaimResult.status, 0, 'checker should reject missing required verification claims');
assert.match(`${missingClaimResult.stdout}\n${missingClaimResult.stderr}`, /required verification claim missing-verification-claim is absent/i);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('✓ production traceability tests passed');
