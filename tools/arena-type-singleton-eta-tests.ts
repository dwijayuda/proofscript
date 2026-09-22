#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const checker = path.join(root, 'packages/arena-checker/dist/main.js');
const corpus = '/mnt/data/arena-corpus-20260915';

function run(rel) {
  const file = path.join(corpus, rel);
  const result = spawnSync(process.execPath, [checker, file], { cwd: root, encoding: 'utf8', timeout: 30000 });
  let parsed = {};
  try { parsed = JSON.parse((result.stdout || '').trim().split(/\r?\n/).at(-1) || '{}'); } catch {}
  return { ...result, parsed };
}

const singleton = run('good/tutorial/075_typeSingletonRecReduction.ndjson');
assert.equal(singleton.status, 0, `type singleton recursor eta should accept, got exit ${singleton.status}: ${singleton.parsed.message}`);
assert.equal(singleton.parsed.status, 'accepted', 'type singleton recursor eta should report accepted');

// Guard against a shortcut: this feature must not turn invalid K/Acc recursor
// tests into accepts.  They remain an unsupported/reject gap until their exact
// Lean rule is implemented, but accepting them would be unsound.
for (const rel of [
  'bad/tutorial/100_ruleKbad.ndjson',
  'bad/tutorial/101_ruleKAcc.ndjson',
  'bad/tutorial/124_accRecNoEta.ndjson',
]) {
  const bad = run(rel);
  assert.notEqual(bad.status, 0, `${rel} must not be accepted by singleton eta`);
}

console.log('ARENA_TYPE_SINGLETON_ETA0=PASS');
