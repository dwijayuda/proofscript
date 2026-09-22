#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const fixtures = [
  ['good/tutorial/055_reduceCtorParam.mk.ndjson', 'reducible wrapper around a recursive constructor field'],
  ['good/tutorial/118_reduceCtorParamRefl.mk.ndjson', 'reducible wrapper with definitional-equal constructor parameter'],
  ['good/tutorial/119_reduceCtorParamRefl2.mk.ndjson', 'reducible wrapper with repeated definitional-equal constructor parameter'],
];

for (const [rel, label] of fixtures) {
  const fixture = path.join('/mnt/data/arena-corpus-20260915', rel);
  const result = spawnSync(process.execPath, [checker, fixture], { cwd: root, encoding: 'utf8', timeout: 20000 });
  const stdout = (result.stdout || '').trim();
  let parsed;
  try { parsed = JSON.parse(stdout); } catch { throw new Error(`${label} did not print JSON: ${stdout}\n${result.stderr}`); }
  assert.equal(result.status, 0, `${label}: expected accept, got exit ${result.status}: ${parsed.message}`);
  assert.equal(parsed.status, 'accepted', `${label} should report accepted`);
}

console.log('ARENA_TRANSPARENT_RECURSIVE_FIELD0=PASS');
