#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(args) {
  return spawnSync(node, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runChecker(extraArgs = []) {
  return run(['tools/check-proof-obligations.ts', ...extraArgs]);
}

const ok = runChecker();
assert.equal(ok.status, 0, `default proof obligation ledger should pass\nstdout:\n${ok.stdout}\nstderr:\n${ok.stderr}`);
assert.match(ok.stdout, /proof obligation ledger holds/);
assert.match(ok.stdout, /K3-TB trusted-boundary/);
assert.match(ok.stdout, /formalLean4EquivalenceProvenObligations/);

const json = runChecker(['--json']);
assert.equal(json.status, 0, `--json proof obligation ledger should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
const parsed = JSON.parse(json.stdout);
const ledgerPath = path.join(root, 'config', 'proof-obligations-ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
assert.equal(parsed.release, ledger.release);
assert.equal(parsed.trustClaim.label, 'K3-TB trusted-boundary');
assert.equal(parsed.trustClaim.lean4Equivalent, false);
assert.equal(parsed.trustClaim.formalLean4EquivalenceProvenObligations, 0);
assert.ok(parsed.obligations >= 8, 'ledger should cover multiple proof-obligation classes');
assert.ok(parsed.requiredForFormalLean4Equivalence >= 6, 'ledger should track required formal equivalence obligations');
assert.equal(parsed.provedFormalLean4EquivalenceObligations, 0);
assert.ok(parsed.stateCounts.open >= 1, 'ledger should keep open obligations visible');

const temp = path.join(os.tmpdir(), `ps-proof-obligations-${process.pid}-${Date.now()}.json`);

const overclaim = structuredClone(ledger);
overclaim.trustClaim.lean4Equivalent = true;
fs.writeFileSync(temp, JSON.stringify(overclaim, null, 2));
const overclaimResult = runChecker(['--ledger', temp]);
assert.notEqual(overclaimResult.status, 0, 'ledger must reject Lean-equivalence overclaims');
assert.match(overclaimResult.stderr, /must not mark lean4Equivalent true/);

const fakeProved = structuredClone(ledger);
fakeProved.obligations[0].state = 'proved';
fakeProved.obligations[0].proofArtifacts = [];
fs.writeFileSync(temp, JSON.stringify(fakeProved, null, 2));
const fakeProvedResult = runChecker(['--ledger', temp]);
assert.notEqual(fakeProvedResult.status, 0, 'proved obligations must cite proof artifacts');
assert.match(fakeProvedResult.stderr, /proved obligations need proofArtifacts/);

const badRequired = structuredClone(ledger);
badRequired.obligations = badRequired.obligations.filter((obligation) => obligation.id !== 'kernel-lean4-equivalence');
fs.writeFileSync(temp, JSON.stringify(badRequired, null, 2));
const missingRequired = runChecker(['--ledger', temp]);
assert.notEqual(missingRequired.status, 0, 'canonical formal obligations must remain in the ledger');
assert.match(missingRequired.stderr, /missing canonical proof obligation kernel-lean4-equivalence/);

const wrongCount = structuredClone(ledger);
wrongCount.trustClaim.formalLean4EquivalenceProvenObligations = 1;
fs.writeFileSync(temp, JSON.stringify(wrongCount, null, 2));
const wrongCountResult = runChecker(['--ledger', temp]);
assert.notEqual(wrongCountResult.status, 0, 'trust claim count must equal actually proved formal obligations');
assert.match(wrongCountResult.stderr, /formal Lean 4 equivalence obligations must remain 0/);

fs.rmSync(temp, { force: true });
console.log('✓ proof obligation ledger regression tests passed');
