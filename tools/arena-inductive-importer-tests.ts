import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const cli = path.join(repoRoot, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS || '/mnt/data/arena-corpus-20260915';
const nodeOptions = '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON';

function run(rel) {
  const file = path.join(corpus, rel);
  assert.equal(fs.existsSync(file), true, `missing Arena fixture ${file}`);
  const res = spawnSync(process.execPath, [cli, file], { cwd: repoRoot, env: { ...process.env, NODE_OPTIONS: nodeOptions }, encoding: 'utf8' });
  let json;
  try { json = JSON.parse(String(res.stdout || '').trim().split(/\r?\n/).at(-1) || '{}'); } catch {}
  return { file, status: res.status, stdout: res.stdout, stderr: res.stderr, json };
}

for (const rel of [
  'good/tutorial/036_empty.ndjson',
  'good/tutorial/037_boolType.ndjson',
  'good/tutorial/038_twoBool.ndjson',
  'good/tutorial/039_andType.ndjson',
  'good/tutorial/040_prodType.ndjson',
  'good/tutorial/041_pprodType.ndjson',
  'good/tutorial/042_pUnitType.ndjson',
  'good/tutorial/043_eqType.ndjson',
  'good/tutorial/044_natDef.ndjson',
  'good/tutorial/125_quotMkType.ndjson',
  'good/tutorial/126_quotIndType.ndjson',
  'good/tutorial/127_quotLiftType.ndjson',
  'good/tutorial/128_quotSoundType.ndjson',
  'good/tutorial/129_quotLiftReduction.ndjson',
  'good/tutorial/130_quotIndReduction.ndjson',
]) {
  const res = run(rel);
  assert.equal(res.status, 0, `${rel} should be accepted by arena-inductive-importer0\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  assert.equal(res.json?.status, 'accepted', `${rel} should report accepted`);
}

for (const rel of [
  'bad/tutorial/046_inductBadNonSort.ndjson',
  'bad/tutorial/047_inductBadNonSort2.ndjson',
  'bad/tutorial/048_inductLevelParam.ndjson',
  'bad/tutorial/049_inductTooFewParams.ndjson',
  'bad/tutorial/050_inductWrongCtorParams.ndjson',
  'bad/tutorial/051_inductWrongCtorResParams.ndjson',
  'bad/tutorial/052_inductWrongCtorResLevel.ndjson',
  'bad/tutorial/053_inductInIndex.ndjson',
  'bad/tutorial/054_indNeg.ndjson',
  'bad/tutorial/056_reduceCtorType.mk.ndjson',
  'bad/tutorial/057_indNegReducible.ndjson',
  'bad/tutorial/073_BogusRecursor.ndjson',
]) {
  const res = run(rel);
  assert.equal(res.status, 1, `${rel} should be rejected, not accepted or declined\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  assert.equal(res.json?.status, 'rejected', `${rel} should report rejected`);
}

const complex = run('good/tutorial/045_rbTreeDef.ndjson');
assert.equal(complex.status, 0, `RBTree indexed recursor should now be accepted after recursive-IH ordering and universe lower-bound fixes
stdout=${complex.stdout}
stderr=${complex.stderr}`);
assert.equal(complex.json?.status, 'accepted');

console.log('ARENA_INDUCTIVE_IMPORTER0=PASS');
