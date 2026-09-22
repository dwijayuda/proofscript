#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka64-executable-expression-translator-eqv-refinement.ts');
const lean = path.join(root, 'assurance/ka64/executable-expression-translator-eqv-refinement-bridge.lean');

assert.ok(fs.existsSync(tool), 'KA64 gate tool must exist');
assert.ok(fs.existsSync(lean), 'KA64 Lean bridge must exist');

const r = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  tool,
  '--strict'
], { cwd: root, encoding: 'utf8', env: { ...process.env, TERM: process.env.TERM ?? 'xterm' } });

if (r.status !== 0) {
  console.error(r.stdout);
  console.error(r.stderr);
}
assert.equal(r.status, 0, 'KA64 strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka64-executable-expression-translator-eqv-refinement0');
assert.equal(result.formalLean4LeanBridgeObligations, 192);
assert.equal(result.newFormalLean4LeanBridgeObligations, 4);
console.log('✓ KA64 executable expression translator source equivalence refinement gate passed');
