#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const checker = path.join(root, 'packages', 'arena-checker', 'dist', 'main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915';

function run(rel) {
  return spawnSync(process.execPath, [checker, path.join(corpus, rel)], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 30000,
  });
}

const bad = run('bad/nat-rec-rules.ndjson');
assert.equal(bad.status, 1, `bad/nat-rec-rules.ndjson must reject malformed recursor rule RHS, got ${bad.status}\nstdout=${bad.stdout}\nstderr=${bad.stderr}`);
const payload = JSON.parse(String(bad.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
assert.equal(payload.status, 'rejected');
assert.match(String(payload.message), /recursor rule.*Nat\.succ|minor premise|argument count|RHS/i);
assert.equal(payload.fullLean4Equivalence, false);
assert.equal(payload.formalLean4EquivalenceProvenObligations, 0);

const goodNat = run('good/tutorial/070_nRec.ndjson');
assert.equal(goodNat.status, 0, `valid Nat recursor tutorial fixture must remain accepted\nstdout=${goodNat.stdout}\nstderr=${goodNat.stderr}`);

console.log('ARENA_RECURSOR_RULE_RHS_VALIDATION0=PASS');
