#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(args, options = {}) {
  return spawnSync(node, args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
}

function runChecker(extraArgs = []) {
  return run(['tools/check-verification-matrix.ts', ...extraArgs]);
}

const ok = runChecker();
assert.equal(ok.status, 0, `default verification matrix should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /verification matrix holds/);
assert.match(ok.stdout, /K3-TB trusted-boundary/);
assert.match(ok.stdout, /formalLean4EquivalenceProvenObligations/);

const json = runChecker(['--json']);
assert.equal(json.status, 0, `--json verification matrix should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
assert.equal(parsed.trustClaim.label, 'K3-TB trusted-boundary');
assert.equal(parsed.trustClaim.lean4Equivalent, false);
assert.equal(parsed.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(parsed.claims >= 8, 'matrix should cover multiple claim classes');
assert.ok(parsed.requiredClaims >= 5, 'matrix should have required gates');
assert.ok(parsed.commandCount >= parsed.requiredClaims, 'required claims should cite commands');

const matrixPath = path.join(root, 'config', 'verification-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const temp = path.join(os.tmpdir(), `ps-verification-matrix-${process.pid}-${Date.now()}.json`);

const badClaimMatrix = structuredClone(matrix);
badClaimMatrix.claims[0].commands = ['test:missing-verification-script'];
fs.writeFileSync(temp, JSON.stringify(badClaimMatrix, null, 2));
const missingScript = runChecker(['--matrix', temp]);
assert.notEqual(missingScript.status, 0, 'missing package scripts must fail the verification matrix');
assert.match(missingScript.stderr, /missing package script test:missing-verification-script/);

const overclaimMatrix = structuredClone(matrix);
overclaimMatrix.trustClaim.lean4Equivalent = true;
fs.writeFileSync(temp, JSON.stringify(overclaimMatrix, null, 2));
const overclaim = runChecker(['--matrix', temp]);
assert.notEqual(overclaim.status, 0, 'matrix must reject accidental Lean-equivalence overclaims');
assert.match(overclaim.stderr, /must not mark lean4Equivalent true/);

const weakRequiredMatrix = structuredClone(matrix);
weakRequiredMatrix.claims = weakRequiredMatrix.claims.map((claim, index) => index === 0 ? { ...claim, requiredForRelease: true, commands: [] } : claim);
fs.writeFileSync(temp, JSON.stringify(weakRequiredMatrix, null, 2));
const weakRequired = runChecker(['--matrix', temp]);
assert.notEqual(weakRequired.status, 0, 'required release claims need command evidence');
assert.match(weakRequired.stderr, /requiredForRelease.*commands/);

fs.rmSync(temp, { force: true });
console.log('✓ verification matrix regression tests passed');
