#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = process.env.ARENA_FIXTURES_DIR ?? process.env.PROOFSCRIPT_ARENA_CORPUS_DIR ?? '/mnt/data/arena-corpus-20260915';
const initPrelude = path.join(corpus, 'good/init-prelude.ndjson');
const badNestedProjection = path.join(corpus, 'bad/nested-unused-param.ndjson');
assert.ok(fs.existsSync(checker), `missing built checker: ${checker}`);
assert.ok(fs.existsSync(initPrelude), `missing real init-prelude fixture: ${initPrelude}`);
assert.ok(fs.existsSync(badNestedProjection), `missing bad nested projection fixture: ${badNestedProjection}`);

function run(file: string) {
  const r = spawnSync(process.execPath, [checker, file], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(r.signal, null, `checker signaled for ${file}\n${r.stdout}\n${r.stderr}`);
  const parsed = JSON.parse(String(r.stdout).trim().split(/\r?\n/).at(-1) ?? '{}');
  return { status: r.status, parsed, raw: `${r.stdout}\n${r.stderr}` };
}

function makeBadNestedRuleFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-arena-nested-rule-preflight-'));
  const out = path.join(dir, 'bad-nested-rule-shape.ndjson');
  const lines = fs.readFileSync(initPrelude, 'utf8').trimEnd().split(/\r?\n/);
  let changed = false;
  const mutated = lines.map((line) => {
    if (changed) return line;
    const record = JSON.parse(line);
    const ind = record.inductive;
    if (!ind) return line;
    const firstType = ind.types?.[0];
    if (!firstType || firstType.numNested !== 2) return line;
    const helper = (ind.recs ?? []).find((rec: { rules?: unknown[] }) => Array.isArray(rec.rules) && rec.rules.length >= 2);
    assert.ok(helper, 'expected first nested block to contain a helper recursor with at least two rules');
    const rules = helper.rules as Array<{ rhs: number }>;
    rules[0].rhs = rules[1].rhs;
    changed = true;
    return JSON.stringify(record);
  });
  assert.equal(changed, true, 'failed to mutate first nested Lean.Syntax block');
  fs.writeFileSync(out, mutated.join('\n') + '\n');
  return out;
}

const good = run(initPrelude);
assert.equal(good.status, 2, good.raw);
assert.equal(good.parsed.status, 'unsupported', good.raw);
assert.equal(good.parsed.unsupportedRecordKind, 'inductive.nested.helper-iota', good.raw);
assert.match(String(good.parsed.message), /validated nested recursor topology for Lean\.Syntax/i, good.raw);
assert.match(String(good.parsed.message), /helper recursor derivation\/iota is not implemented/i, good.raw);
assert.equal(good.parsed.fullLean4Equivalence, false);
assert.equal(good.parsed.formalLean4EquivalenceProvenObligations, 0);

const badProjection = run(badNestedProjection);
assert.equal(badProjection.status, 1, badProjection.raw);
assert.equal(badProjection.parsed.status, 'rejected', badProjection.raw);
assert.match(String(badProjection.parsed.message), /nested inductive constructor contains projection/i, badProjection.raw);

const badRule = makeBadNestedRuleFixture();
try {
  const rejected = run(badRule);
  assert.equal(rejected.status, 1, rejected.raw);
  assert.equal(rejected.parsed.status, 'rejected', rejected.raw);
  assert.match(String(rejected.parsed.message), /nested recursor rule.*does not match independently generated Lean-style nested rule|does not abstract the expected nested recursor prefix|argument count/i, rejected.raw);
} finally {
  fs.rmSync(path.dirname(badRule), { recursive: true, force: true });
}

console.log('ARENA_NESTED_RECURSOR_PREFLIGHT0=PASS');
