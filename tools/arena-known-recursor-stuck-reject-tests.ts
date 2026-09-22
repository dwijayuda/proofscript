#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = '/mnt/data/arena-corpus-20260915';

for (const [rel, label] of [
  ['bad/tutorial/100_ruleKbad.ndjson', 'Eq.rec K must not fire when the reconstructed constructor type mismatches the major type'],
  ['bad/tutorial/101_ruleKAcc.ndjson', 'Acc.rec is not K-like'],
  ['bad/tutorial/124_accRecNoEta.ndjson', 'Acc.rec has no neutral-major eta reduction'],
]) {
  const result = spawnSync(process.execPath, [checker, path.join(corpus, rel)], { cwd: root, encoding: 'utf8', timeout: 30000 });
  let parsed = {};
  try { parsed = JSON.parse((result.stdout || '').trim().split(/\r?\n/).at(-1) || '{}'); } catch {}
  assert.equal(result.status, 1, `${label}: expected reject exit 1, got ${result.status}: ${parsed.message}`);
  assert.equal(parsed.status, 'rejected', `${label}: expected rejected status`);
}

console.log('ARENA_KNOWN_RECURSOR_STUCK_REJECT0=PASS');
