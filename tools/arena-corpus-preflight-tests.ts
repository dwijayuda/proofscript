#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = path.join(root, 'tools', 'arena-corpus-preflight.ts');

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--disable-warning=ExperimentalWarning',
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    script,
    ...args,
  ], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8' });
}

const missing = run(['--fixtures-dir', path.join(os.tmpdir(), `missing-arena-${process.pid}`)]);
assert.equal(missing.status, 1, `missing corpus must fail; stdout=${missing.stdout}\nstderr=${missing.stderr}`);
assert.match(missing.stdout + missing.stderr, /arena_corpus_missing|missing required arena fixtures/i);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-preflight-'));
for (const rel of [
  'bad/extra-rec.ndjson',
  'bad/orphan-rec.ndjson',
  'bad/bogus1.ndjson',
  'bad/tutorial/002_badDef.ndjson',
  'good/tutorial/001_basicDef.ndjson',
  'good/tutorial/036_empty.ndjson',
  'good/tutorial/074_existsRec.ndjson',
  'good/tutorial/086_PSigma.snd.ndjson',
  'good/corner-cases/proof-param-ok.ndjson',
]) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{}\n');
}
const present = run(['--fixtures-dir', dir, '--min-ndjson', '9']);
assert.equal(present.status, 0, `minimal required corpus must pass; stdout=${present.stdout}\nstderr=${present.stderr}`);
const json = JSON.parse(present.stdout.trim());
assert.equal(json.status, 'arena_corpus_available');
assert.equal(json.missingRequired.length, 0);

console.log('ARENA_CORPUS_PREFLIGHT_TESTS=PASS');
