#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR || '/mnt/data/arena-corpus-20260915';

function run(rel) {
  const file = path.join(corpus, rel);
  return spawnSync(process.execPath, [checker, file], { cwd: root, encoding: 'utf8' });
}

for (const rel of ['bad/extra-rec.ndjson', 'bad/orphan-rec.ndjson']) {
  const result = run(rel);
  assert.equal(
    result.status,
    1,
    `${rel} must reject malformed single-inductive recursor block, got ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.match(
    result.stdout + result.stderr,
    /single non-mutual inductive|exactly one recursor|malformed/i,
    `${rel} diagnostic should explain the recursor invariant\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
}

const validEmpty = run('good/tutorial/036_empty.ndjson');
assert.equal(validEmpty.status, 0, `valid empty inductive must still accept, got ${validEmpty.status}\nstdout=${validEmpty.stdout}\nstderr=${validEmpty.stderr}`);

console.log('ARENA_SINGLE_INDUCTIVE_RECURSOR_INVARIANT0=PASS');
