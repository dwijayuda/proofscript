#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = '/mnt/data/arena-corpus-20260915';

for (const [rel, label] of [
  ['good/tutorial/045_rbTreeDef.ndjson', 'RBTree indexed recursive definition'],
  ['good/tutorial/071_rbTreeRef.ndjson', 'RBTree reference theorem'],
  ['good/tutorial/082_RBTree.id_spec.ndjson', 'RBTree.id_spec recursor/iota theorem'],
]) {
  const result = spawnSync(process.execPath, [checker, path.join(corpus, rel)], { cwd: root, encoding: 'utf8', timeout: 30000 });
  const stdout = (result.stdout || '').trim();
  let parsed = {};
  try { parsed = JSON.parse(stdout.split(/\r?\n/).at(-1) || '{}'); } catch {}
  assert.equal(result.status, 0, `${label}: expected accept exit 0, got ${result.status}: ${parsed.message ?? result.stderr}`);
  assert.equal(parsed.status, 'accepted', `${label}: expected accepted status`);
}

console.log('ARENA_RBTREE_RECURSIVE_IH_ORDER0=PASS');
