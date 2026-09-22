#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? process.env.ARENA_FIXTURES_DIR ?? '/mnt/data/arena-corpus-20260915';

function run(rel: string) {
  return spawnSync(process.execPath, [checker, path.join(corpus, rel)], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: '--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

function parse(result: ReturnType<typeof spawnSync>) {
  return JSON.parse(String(result.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
}

const bad = run('bad/rec-missing-ih.ndjson');
assert.equal(bad.status, 1, bad.stdout + bad.stderr);
const badPayload = parse(bad);
assert.equal(badPayload.status, 'rejected');
assert.match(String(badPayload.message), /Native64TwoHashOwner\.step|argument count|minor premise|induction/i);

const good = run('good/tutorial/120_rTreeRec.ndjson');
assert.equal(good.status, 0, good.stdout + good.stderr);

console.log('ARENA_RECURSOR_RULE_ARITY_VALIDATION0=PASS');
