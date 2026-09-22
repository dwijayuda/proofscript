#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915';
const initPrelude = path.join(corpus, 'good/init-prelude.ndjson');
const reduceCtorParam = path.join(corpus, 'good/tutorial/055_reduceCtorParam.mk.ndjson');
assert.ok(fs.existsSync(checker), `missing built checker: ${checker}`);
assert.ok(fs.existsSync(initPrelude), `missing real init-prelude fixture: ${initPrelude}`);
assert.ok(fs.existsSync(reduceCtorParam), `missing regression fixture: ${reduceCtorParam}`);

function run(file: string) {
  const result = spawnSync(process.execPath, [checker, file], {
    cwd: root,
    env: { ...process.env, NODE_OPTIONS: '--experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON' },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.signal, null, `checker signaled for ${file}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const payload = JSON.parse(String(result.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
  return { status: result.status, payload, stdout: result.stdout, stderr: result.stderr };
}

const regression = run(reduceCtorParam);
assert.equal(regression.status, 0, `ordinary transparent recursive-field wrappers must remain accepted\nstdout=${regression.stdout}\nstderr=${regression.stderr}`);
assert.equal(regression.payload.status, 'accepted');

const prelude = run(initPrelude);
assert.equal(prelude.status, 2, `init-prelude should decline only at the nested inductive frontier now\nstdout=${prelude.stdout}\nstderr=${prelude.stderr}`);
assert.equal(prelude.payload.status, 'unsupported');
assert.equal(prelude.payload.unsupportedRecordKind, 'inductive.nested.helper-iota', `must advance past Lean.SourceInfo.rec / Lean.Name.rec and validate nested topology before declining helper iota\n${prelude.stdout}`);
assert.doesNotMatch(String(prelude.payload.message), /Lean\.SourceInfo|Lean\.Name|inductive\.rec\.type/i);
assert.equal(prelude.payload.fullLean4Equivalence, false);
assert.equal(prelude.payload.fullyFormalK3, false);
assert.equal(prelude.payload.formalLean4EquivalenceProvenObligations, 0);

console.log('ARENA_INIT_PRELUDE_SOURCEINFO_TO_NESTED_PREFLIGHT0=PASS');
