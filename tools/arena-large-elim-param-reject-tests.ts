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

const badLargeElim = run('bad/large-elim-param.ndjson');
assert.equal(
  badLargeElim.status,
  1,
  `large-elim-param must be rejected, got ${badLargeElim.status}\nstdout=${badLargeElim.stdout}\nstderr=${badLargeElim.stderr}`,
);
assert.match(badLargeElim.stdout + badLargeElim.stderr, /universe polymorphic resulting type|large elimination|resulting universe|Prop/i);


const goodPUnit = run('good/tutorial/042_pUnitType.ndjson');
assert.equal(goodPUnit.status, 0, `singleton Sort-polymorphic PUnit tutorial case must still accept, got ${goodPUnit.status}\nstdout=${goodPUnit.stdout}\nstderr=${goodPUnit.stderr}`);

const goodLevelOrder = run('good/level-index-out-of-order.ndjson');
assert.equal(goodLevelOrder.status, 0, `unrelated valid polymorphic level-index case must still accept, got ${goodLevelOrder.status}`);

console.log('ARENA_LARGE_ELIM_PARAM_REJECT=PASS');
