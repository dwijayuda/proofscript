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
  assert.equal(result.signal, null, `checker signaled for ${rel}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const parsed = JSON.parse(String(result.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
  return { status: result.status, parsed, stdout: result.stdout, stderr: result.stderr };
}

for (const rel of ['bad/proj-of-subst-prop.ndjson', 'bad/rec-of-subst-prop.ndjson']) {
  const result = run(rel);
  assert.equal(result.status, 1, `${rel} must be rejected, not declined/accepted\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.equal(result.parsed.status, 'rejected');
  assert.match(String(result.parsed.message), /stuck recursor result sort|transparently unfolded stuck recursor result sort|type expected|Eq\.rec/i);
}

const good = run('good/tutorial/098_projRed.ndjson');
assert.equal(good.status, 0, `valid projection-reduction tutorial case must remain accepted\nstdout=${good.stdout}\nstderr=${good.stderr}`);
assert.equal(good.parsed.status, 'accepted');

console.log('ARENA_TRANSPARENT_RESULT_SORT_REJECT0=PASS');
