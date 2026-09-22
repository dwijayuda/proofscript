#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checker = path.join(root, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? process.env.ARENA_FIXTURES_DIR ?? '/mnt/data/arena-corpus-20260915';

function run(rel: string) {
  return spawnSync(process.execPath, [checker, path.join(corpus, rel)], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: '--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30000,
  });
}

function parse(run: ReturnType<typeof spawnSync>) {
  return JSON.parse(String(run.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
}

const badStuck = run('bad/proj-of-stuck-prop.ndjson');
assert.equal(badStuck.status, 1, badStuck.stdout + badStuck.stderr);
const parsed = parse(badStuck);
assert.equal(parsed.status, 'rejected');
assert.match(String(parsed.message), /Native64ResultSortOwner.*stuck recursor result sort.*Native64ResultSortGate\.rec/i);

const goodProjection = run('good/tutorial/098_projRed.ndjson');
assert.equal(goodProjection.status, 0, goodProjection.stdout + goodProjection.stderr);

console.log('ARENA_INDUCTIVE_RESULT_SORT_REJECT0=PASS');
