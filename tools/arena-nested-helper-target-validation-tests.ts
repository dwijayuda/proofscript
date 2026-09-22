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
assert.ok(fs.existsSync(checker), `missing built checker: ${checker}`);
assert.ok(fs.existsSync(initPrelude), `missing real init-prelude fixture: ${initPrelude}`);

function parseNameMap(lines: readonly string[]): Map<number, string> {
  const names = new Map<number, string>([[0, '']]);
  for (const line of lines) {
    const record = JSON.parse(line);
    if (!Number.isSafeInteger(record.in)) continue;
    if (record.str) {
      const prefix = names.get(record.str.pre);
      if (prefix === undefined) continue;
      names.set(record.in, prefix.length === 0 ? record.str.str : `${prefix}.${record.str.str}`);
    } else if (record.num) {
      const prefix = names.get(record.num.pre);
      if (prefix === undefined) continue;
      names.set(record.in, prefix.length === 0 ? String(record.num.i) : `${prefix}.${record.num.i}`);
    }
  }
  return names;
}

function nameId(names: Map<number, string>, target: string): number {
  for (const [id, name] of names) if (name === target) return id;
  throw new Error(`missing name id for ${target}`);
}

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

function makeWrongHelperTargetFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-arena-nested-helper-target-'));
  const out = path.join(dir, 'bad-nested-helper-target.ndjson');
  const lines = fs.readFileSync(initPrelude, 'utf8').trimEnd().split(/\r?\n/);
  const names = parseNameMap(lines);
  const arrayMk = nameId(names, 'Array.mk');
  let changed = false;
  const mutated = lines.map((line) => {
    if (changed) return line;
    const record = JSON.parse(line);
    const ind = record.inductive;
    if (!ind) return line;
    const firstType = ind.types?.[0];
    if (!firstType || firstType.numNested !== 2) return line;
    const rec2 = (ind.recs ?? []).find((rec: { name?: number }) => names.get(rec.name ?? -1) === 'Lean.Syntax.rec_2');
    assert.ok(rec2, 'expected Lean.Syntax.rec_2 helper recursor');
    const rules = rec2.rules as Array<{ ctor: number; nfields: number }>;
    assert.ok(rules.length >= 1, 'expected Lean.Syntax.rec_2 helper rules');
    // Forge the helper-recursive target: List.nil rule now claims Array.mk.
    // Array.mk is already known and validated before Lean.Syntax, so the P5.93
    // target-insensitive preflight check accepted it as a known container constructor and merely
    // declined helper iota. A safer checker must reject the mixed/wrong target.
    rules[0].ctor = arrayMk;
    changed = true;
    return JSON.stringify(record);
  });
  assert.equal(changed, true, 'failed to mutate first Lean.Syntax nested block');
  fs.writeFileSync(out, mutated.join('\n') + '\n');
  return out;
}

const good = run(initPrelude);
assert.equal(good.status, 2, good.raw);
assert.equal(good.parsed.status, 'unsupported', good.raw);
assert.equal(good.parsed.unsupportedRecordKind, 'inductive.nested.helper-iota', good.raw);

const bad = makeWrongHelperTargetFixture();
try {
  const rejected = run(bad);
  assert.equal(rejected.status, 1, rejected.raw);
  assert.equal(rejected.parsed.status, 'rejected', rejected.raw);
  assert.match(String(rejected.parsed.message), /nested helper recursor .* targets multiple constructor families|nfields .* does not match validated constructor field count|does not cover all constructors/i, rejected.raw);
} finally {
  fs.rmSync(path.dirname(bad), { recursive: true, force: true });
}

console.log('ARENA_NESTED_HELPER_TARGET_VALIDATION0=PASS');
