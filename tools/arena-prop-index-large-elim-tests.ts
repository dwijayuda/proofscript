#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const cases = [
  ['good/tutorial/095_projDataIndexRec.ndjson', 0, 'ProjDataIndex.rec may eliminate into Sort because the only non-parameter field is proof-valued'],
  ['bad/tutorial/096_projIndexData.ndjson', 1, 'ProjDataIndex data projection remains forbidden even though its value appears as an index'],
  ['bad/tutorial/097_projIndexData2.ndjson', 1, 'Projection after forbidden data extraction remains rejected'],
];

for (const [rel, expected, label] of cases) {
  const fixture = path.join('/mnt/data/arena-corpus-20260915', rel);
  const result = spawnSync(process.execPath, [checker, fixture], { cwd: root, encoding: 'utf8', timeout: 20000 });
  const stdout = (result.stdout || '').trim();
  let parsed;
  try { parsed = JSON.parse(stdout); } catch { throw new Error(`${label} did not print JSON: ${stdout}\n${result.stderr}`); }
  assert.equal(result.status, expected, `${label}: expected exit ${expected}, got ${result.status}: ${parsed.message}`);
}

console.log('ARENA_PROP_INDEX_LARGE_ELIM0=PASS');
