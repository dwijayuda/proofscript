#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools/kernel-v71-k3tb-lean-env-doctor.ts');
const expectedCommit = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';

function runDoctor(env = {}, args = ['--json']) {
  return spawnSync(process.execPath, [tool, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function json(result) {
  assert.equal(result.status, 0, `doctor should be non-fatal by default\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return JSON.parse(result.stdout);
}

function makeExecutable(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  fs.chmodSync(file, 0o755);
  return file;
}

const missing = json(runDoctor({ PROOFSCRIPT_LEAN_BIN: '' }));
assert.equal(missing.status, 'BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN');
assert.equal(missing.expected.version, '4.33.1');
assert.equal(missing.expected.commit, expectedCommit);
assert.equal(missing.boundary, 'K3TB_NOT_FULLY_FORMAL_K3');
assert.equal(missing.publishPreflightCanRun, false);
assert.match(missing.nextAction, /Set PROOFSCRIPT_LEAN_BIN/);

const nonexistent = json(runDoctor({ PROOFSCRIPT_LEAN_BIN: path.join(os.tmpdir(), 'missing-lean-binary') }));
assert.equal(nonexistent.status, 'BLOCKED_LEAN_BIN_NOT_FOUND');
assert.equal(nonexistent.publishPreflightCanRun, false);

const tmpMismatch = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-k3tb-doctor-mismatch-'));
const mismatchLean = makeExecutable(tmpMismatch, 'lean', '#!/bin/sh\necho "Lean (version 4.32.0, x86_64-unknown-linux-gnu, commit badbad, Release)"\n');
makeExecutable(tmpMismatch, 'lake', '#!/bin/sh\necho "Lake version 5.0.0"\n');
const mismatch = json(runDoctor({ PROOFSCRIPT_LEAN_BIN: mismatchLean, PATH: `${tmpMismatch}:${process.env.PATH ?? ''}` }));
assert.equal(mismatch.status, 'BLOCKED_LEAN_VERSION_MISMATCH');
assert.equal(mismatch.actual.version, '4.32.0');
assert.equal(mismatch.publishPreflightCanRun, false);

const tmpNoLake = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-k3tb-doctor-nolake-'));
const noLakeLean = makeExecutable(tmpNoLake, 'lean', `#!/bin/sh\necho "Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit ${expectedCommit}, Release)"\n`);
const emptyPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-k3tb-doctor-empty-path-'));
const noLake = json(runDoctor({ PROOFSCRIPT_LEAN_BIN: noLakeLean, PATH: emptyPath }));
assert.equal(noLake.status, 'BLOCKED_LAKE_NOT_FOUND');
assert.equal(noLake.actual.version, '4.33.1');
assert.equal(noLake.publishPreflightCanRun, false);

const tmpReady = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-k3tb-doctor-ready-'));
const readyLean = makeExecutable(tmpReady, 'lean', `#!/bin/sh\necho "Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit ${expectedCommit}, Release)"\n`);
makeExecutable(tmpReady, 'lake', '#!/bin/sh\necho "Lake version 5.0.0"\n');
const ready = json(runDoctor({ PROOFSCRIPT_LEAN_BIN: readyLean, PATH: `${tmpReady}:${process.env.PATH ?? ''}` }));
assert.equal(ready.status, 'READY');
assert.equal(ready.actual.version, '4.33.1');
assert.equal(ready.actual.commit, expectedCommit);
assert.equal(ready.actual.lakeFound, true);
assert.equal(ready.publishPreflightCanRun, true);
assert.equal(ready.claimGuard, 'trusted-boundary K3-TB; not fully formal K3');

const strictBlocked = runDoctor({ PROOFSCRIPT_LEAN_BIN: '' }, ['--strict']);
assert.notEqual(strictBlocked.status, 0, 'strict doctor must fail when Lean is missing');
assert.match(`${strictBlocked.stdout}${strictBlocked.stderr}`, /BLOCKED_MISSING_PROOFSCRIPT_LEAN_BIN/);
const strictReady = runDoctor({ PROOFSCRIPT_LEAN_BIN: readyLean, PATH: `${tmpReady}:${process.env.PATH ?? ''}` }, ['--strict']);
assert.equal(strictReady.status, 0, `strict doctor should pass when ready\n${strictReady.stdout}${strictReady.stderr}`);
assert.match(`${strictReady.stdout}${strictReady.stderr}`, /K3TB_LEAN_ENV_STATUS=READY/);

const publishVerifier = fs.readFileSync(path.join(root, 'tools/kernel-v71-k3tb-publish-verify.ts'), 'utf8');
assert.ok(publishVerifier.includes('kernel-v71-k3tb-lean-env-doctor.ts'), 'publish verifier must run the K3-TB Lean env doctor first');
assert.ok(publishVerifier.includes('--strict'), 'publish verifier must use the doctor as a strict gate');
assert.ok(!publishVerifier.includes('npm publish'), 'publish verifier must not publish to npm');

console.log('K3TB_LEAN_ENV_DOCTOR_TEST_STATUS=PASS');
console.log('K3TB_LEAN_ENV_DOCTOR_BOUNDARY=trusted-boundary K3-TB; not fully formal K3');
