#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const cases = [
  ['good/tutorial/089_projProp1.ndjson', 0, 'projProp1 allowed before dependent data field'],
  ['bad/tutorial/090_projProp2.ndjson', 1, 'projProp2 data projection rejected'],
  ['good/tutorial/091_projProp3.ndjson', 0, 'projProp3 proof projection before dependent data field allowed'],
  ['bad/tutorial/092_projProp4.ndjson', 1, 'projProp4 data projection rejected'],
  ['bad/tutorial/093_projProp5.ndjson', 1, 'projProp5 proof depending on data rejected'],
  ['bad/tutorial/094_projProp6.ndjson', 1, 'projProp6 projection after dependent data field rejected'],
];
for (const [rel, expected, label] of cases) {
  const file = path.join('/mnt/data/arena-corpus-20260915', rel);
  const result = spawnSync(process.execPath, [checker, file], { cwd: root, encoding: 'utf8', timeout: 20000 });
  const stdout = (result.stdout || '').trim();
  let parsed;
  try { parsed = JSON.parse(stdout); } catch { throw new Error(`${label} did not print JSON: ${stdout}\n${result.stderr}`); }
  assert.equal(result.status, expected, `${label}: expected exit ${expected}, got ${result.status}: ${parsed.message}`);
}
console.log('ARENA_PROP_PROJECTION_CONFORMANCE0=PASS');
