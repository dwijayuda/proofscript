#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const fixtures = [
  ['/mnt/data/arena-corpus-20260915/good/tutorial/074_existsRec.ndjson', 'Exists.rec dependent proof field recursor'],
  ['/mnt/data/arena-corpus-20260915/good/tutorial/086_PSigma.snd.ndjson', 'PSigma.snd dependent data field projection'],
];

for (const [fixture, label] of fixtures) {
  const result = spawnSync(process.execPath, [checker, fixture], { cwd: root, encoding: 'utf8' });
  const output = (result.stdout || '').trim();
  let parsed;
  try { parsed = JSON.parse(output); } catch { throw new Error(`${label} did not print JSON: ${output}\n${result.stderr}`); }
  assert.equal(result.status, 0, `${label} should be accepted by the Arena adapter/K3-TB kernel slice, got ${result.status}: ${parsed.message}`);
  assert.equal(parsed.status, 'accepted', `${label} should report accepted`);
}

console.log('ARENA_DEPENDENT_FIELD_RECURSOR0=PASS');
