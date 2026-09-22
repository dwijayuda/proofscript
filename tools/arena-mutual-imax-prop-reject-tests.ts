#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checker = path.join(root, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915';
function run(rel: string) {
  const file = path.join(corpus, rel);
  assert.ok(fs.existsSync(file), `missing fixture ${file}`);
  const result = spawnSync(process.execPath, [checker, file], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: '--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30000,
  });
  const parsed = JSON.parse(String(result.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
  return { status: result.status, parsed, stdout: result.stdout, stderr: result.stderr };
}
const bad = run('bad/proj-of-imax-prop.ndjson');
assert.equal(bad.status, 1, `proj-of-imax-prop must be rejected, not declined\nstdout=${bad.stdout}\nstderr=${bad.stderr}`);
assert.equal(bad.parsed.status, 'rejected');
assert.match(String(bad.parsed.message), /invalid projection|resulting universe|not Prop|imax/i);
const good = run('good/proof-irrel.ndjson');
assert.equal(good.status, 0, `good proof-irrel fixture must remain accepted\nstdout=${good.stdout}\nstderr=${good.stderr}`);
assert.equal(good.parsed.status, 'accepted');
console.log('ARENA_MUTUAL_IMAX_PROP_REJECT0=PASS');
