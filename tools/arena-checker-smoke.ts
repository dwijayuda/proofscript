import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const cli = path.join(repoRoot, 'packages', 'arena-checker', 'dist', 'main.js');
const nodeOptions = '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON';
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-arena-smoke-'));

function writeFixture(name, lines) {
  const file = path.join(tempDir, name);
  fs.writeFileSync(file, `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`);
  return file;
}

function runFixture(file) {
  return spawnSync(process.execPath, [cli, file], {
    cwd: repoRoot,
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    encoding: 'utf8',
  });
}

const meta = {
  meta: {
    exporter: { name: 'proofscript-arena-smoke', version: '0.0.0' },
    lean: { githash: '819816b2e0a3bf405af45ae5c7af2491d8f5bee6', version: '4.33.1' },
    format: { version: '3.1.0' },
  },
};

const valid = writeFixture('valid-axiom.ndjson', [
  meta,
  { str: { pre: 0, str: 'SmokeAxiom' }, in: 1 },
  { succ: 0, il: 1 },
  { sort: 1, ie: 1 },
  { axiom: { name: 1, levelParams: [], type: 1, isUnsafe: false } },
]);

const bad = writeFixture('bad-definition.ndjson', [
  meta,
  { str: { pre: 0, str: 'badProof' }, in: 1 },
  { succ: 0, il: 1 },
  { sort: 0, ie: 1 },
  { sort: 1, ie: 2 },
  { def: { name: 1, levelParams: [], type: 1, value: 2, hints: { regular: 0 }, safety: 'safe', all: [] } },
]);


const defOpaqueHintsStillUnfolds = writeFixture('def-opaque-hints-still-unfolds.ndjson', [
  meta,
  { str: { pre: 0, str: 'constType' }, in: 1 },
  { str: { pre: 0, str: 'x' }, in: 2 },
  { str: { pre: 0, str: 'y' }, in: 3 },
  { succ: 0, il: 1 },
  { sort: 1, ie: 1 },
  { forallE: { binderInfo: 'default', body: 1, name: 3, type: 1 }, ie: 2 },
  { forallE: { binderInfo: 'default', body: 2, name: 2, type: 1 }, ie: 3 },
  { bvar: 1, ie: 4 },
  { lam: { binderInfo: 'default', body: 4, name: 3, type: 1 }, ie: 5 },
  { lam: { binderInfo: 'default', body: 5, name: 2, type: 1 }, ie: 6 },
  { def: { name: 1, levelParams: [], type: 3, value: 6, hints: 'opaque', safety: 'safe', all: [] } },
  { str: { pre: 0, str: 'usesConstType' }, in: 4 },
  { const: { name: 1, us: [] }, ie: 7 },
  { sort: 0, ie: 8 },
  { app: { fn: 7, arg: 8 }, ie: 9 },
  { forallE: { binderInfo: 'default', body: 8, name: 2, type: 8 }, ie: 10 },
  { app: { fn: 9, arg: 10 }, ie: 11 },
  { bvar: 0, ie: 12 },
  { forallE: { binderInfo: 'default', body: 12, name: 2, type: 8 }, ie: 13 },
  { def: { name: 4, levelParams: [], type: 11, value: 13, hints: { regular: 0 }, safety: 'safe', all: [] } },
]);

const unsupported = writeFixture('unsupported-inductive.ndjson', [
  meta,
  { inductive: { types: [], ctors: [], recs: [] } },
]);

const malformed = path.join(tempDir, 'malformed.ndjson');
fs.writeFileSync(malformed, '{not json}\n');

const validRun = runFixture(valid);
assert.equal(validRun.status, 0, `valid fixture should exit 0\nstdout=${validRun.stdout}\nstderr=${validRun.stderr}`);
assert.match(validRun.stdout, /"status":"accepted"/, 'valid fixture should report accepted JSON');

const badRun = runFixture(bad);
assert.equal(badRun.status, 1, `bad fixture should exit 1\nstdout=${badRun.stdout}\nstderr=${badRun.stderr}`);
assert.match(badRun.stdout + badRun.stderr, /rejected|invalid/i, 'bad fixture should report rejection');


const defOpaqueHintsRun = runFixture(defOpaqueHintsStillUnfolds);
assert.equal(defOpaqueHintsRun.status, 0, `def/hints=opaque fixture should remain a kernel-unfoldable definition
stdout=${defOpaqueHintsRun.stdout}
stderr=${defOpaqueHintsRun.stderr}`);
assert.match(defOpaqueHintsRun.stdout, /"status":"accepted"/, 'def/hints=opaque fixture should report accepted JSON');

const unsupportedRun = runFixture(unsupported);
assert.equal(unsupportedRun.status, 2, `unsupported fixture should exit 2\nstdout=${unsupportedRun.stdout}\nstderr=${unsupportedRun.stderr}`);
assert.match(unsupportedRun.stdout + unsupportedRun.stderr, /unsupported|declined/i, 'unsupported fixture should report unsupported/declined');

const malformedRun = runFixture(malformed);
assert.equal(malformedRun.status, 1, `malformed fixture should exit 1\nstdout=${malformedRun.stdout}\nstderr=${malformedRun.stderr}`);
assert.match(malformedRun.stdout + malformedRun.stderr, /malformed|json/i, 'malformed fixture should report JSON/malformed diagnostic');

console.log('ARENA_CHECKER_SMOKE=PASS');
