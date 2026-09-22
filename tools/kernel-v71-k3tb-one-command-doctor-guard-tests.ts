#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const verifierPath = path.join(root, 'tools/kernel-v71-k3tb-one-command-verify.ts');
const verifier = fs.readFileSync(verifierPath, 'utf8');
const verifyProduction = fs.readFileSync(path.join(root, 'tools/verify-production.ts'), 'utf8');

assert.match(pkg.version, /^0\.1\.0-production-p5\.85-arena-full-tutorial0(?:-WIP)?$/, 'package version must identify the current P5.85 Arena full-tutorial release while preserving the K3-TB doctor guard');
assert.ok(pkg.scripts['test:v71:k3tb-one-command-doctor-guard'].includes('node tools/kernel-v71-k3tb-one-command-doctor-guard-tests.ts'));
assert.match(verifyProduction, /test:v71:k3tb-one-command-doctor-guard/, 'production verifier must include the one-command doctor guard');
assert.match(verifier, /kernel-v71-k3tb-lean-env-doctor\.ts/, 'one-command K3-TB verifier must run the strict Lean env doctor first');
assert.match(verifier, /--strict/, 'one-command K3-TB verifier must use the doctor as a strict gate');
assert.doesNotMatch(verifier, /assert\.ok\(lean, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4\.33\.1'\)/, 'one-command verifier must not use the old opaque missing-Lean assertion');

const blocked = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'verify:k3tb'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, PROOFSCRIPT_LEAN_BIN: '' },
  timeout: 60_000,
  maxBuffer: 16 * 1024 * 1024,
});
const blockedOut = `${blocked.stdout ?? ''}${blocked.stderr ?? ''}`;
assert.notEqual(blocked.status, 0, 'verify:k3tb must remain strict and fail when Lean is missing');
assert.match(blockedOut, /K3TB_LEAN_ENV_STATUS=BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN/, 'verify:k3tb should fail with doctor diagnostics when Lean is missing');
assert.match(blockedOut, /K3TB_LEAN_ENV_EXPECTED_VERSION=4\.33\.1/, 'verify:k3tb should print expected Lean version');
assert.match(blockedOut, /K3TB_LEAN_ENV_EXPECTED_COMMIT=819816b2e0a3bf405af45ae5c7af2491d8f5bee6/, 'verify:k3tb should print expected Lean commit');
assert.doesNotMatch(blockedOut, /AssertionError \[ERR_ASSERTION\]: PROOFSCRIPT_LEAN_BIN must point to Lean 4\.33\.1/, 'verify:k3tb should not expose the old opaque assertion message');
assert.doesNotMatch(blockedOut, /AssertionError \[ERR_ASSERTION\]/, 'verify:k3tb should fail without any Node AssertionError when the doctor blocks');

const publishBlocked = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'verify:k3tb:publish'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, PROOFSCRIPT_LEAN_BIN: '' },
  timeout: 60_000,
  maxBuffer: 16 * 1024 * 1024,
});
const publishBlockedOut = `${publishBlocked.stdout ?? ''}${publishBlocked.stderr ?? ''}`;
assert.notEqual(publishBlocked.status, 0, 'verify:k3tb:publish must remain strict and fail when Lean is missing');
assert.match(publishBlockedOut, /K3TB_LEAN_ENV_STATUS=BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN/, 'verify:k3tb:publish should fail with doctor diagnostics when Lean is missing');
assert.doesNotMatch(publishBlockedOut, /AssertionError \[ERR_ASSERTION\]/, 'verify:k3tb:publish should fail without any Node AssertionError when the doctor blocks');

for (const rel of ['README.md', 'VERIFY_K3TB.md', 'PRODUCTION_P6_BUILD_REPORT.md', 'PRODUCTION_P6_FINAL.md']) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.match(text, /npm run verify:k3tb/, `${rel} should document one-command K3-TB verification`);
  assert.match(text, /doctor:k3tb|Lean environment doctor/, `${rel} should mention the Lean environment doctor for K3-TB verification`);
  assert.match(text, /trusted-boundary K3-TB|K3-TB/, `${rel} must preserve the K3-TB label`);
  assert.match(text, /not fully formal K3|not full formal K3|NOT_FULLY_FORMAL_K3/i, `${rel} must preserve the non-fully-formal caveat`);
}

console.log('K3TB_ONE_COMMAND_DOCTOR_GUARD_STATUS=PASS');
console.log('K3TB_ONE_COMMAND_DOCTOR_GUARD_BOUNDARY=trusted-boundary K3-TB; not fully formal K3');
