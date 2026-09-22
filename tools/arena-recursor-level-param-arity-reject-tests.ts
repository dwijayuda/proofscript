#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checker = path.join(root, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915';
const fixture = path.join(corpus, 'bad/large-elim-prop-bool.ndjson');

const result = spawnSync(process.execPath, [checker, fixture], {
  cwd: root,
  env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
  encoding: 'utf8',
  timeout: 30000,
});
assert.equal(result.status, 1, `large-elim-prop-bool must reject malformed recursor universe arity for supported Prop family\nstdout=${result.stdout}\nstderr=${result.stderr}`);
const payload = JSON.parse(String(result.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
assert.equal(payload.status, 'rejected');
assert.match(String(payload.message), /recursor universe-parameter arity/i);
assert.equal(payload.fullLean4Equivalence, false);
assert.equal(payload.formalLean4EquivalenceProvenObligations, 0);
console.log('ARENA_RECURSOR_LEVEL_PARAM_ARITY_REJECT0=PASS');
