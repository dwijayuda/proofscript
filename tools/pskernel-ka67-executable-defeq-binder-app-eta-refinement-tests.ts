#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tool = path.join(root, 'tools/pskernel-ka67-executable-defeq-binder-app-eta-refinement.ts');
const lean = path.join(root, 'assurance/ka67/executable-defeq-binder-app-eta-refinement-bridge.lean');

assert.ok(fs.existsSync(tool), 'KA67 gate tool must exist');
assert.ok(fs.existsSync(lean), 'KA67 Lean bridge must exist');

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
assert.equal(r.status, 0, 'KA67 strict gate must pass');
const result = JSON.parse(r.stdout);
assert.equal(result.status, 'passed');
assert.equal(result.checkpoint, 'proofscript-v1-ka67-executable-defeq-binder-app-eta-refinement0');
assert.equal(result.formalLean4LeanBridgeObligations, 204);
assert.equal(result.newFormalLean4LeanBridgeObligations, 4);
assert.equal(result.baselineObligations, 200);
console.log('✓ KA67 executable DefEq binder/app/eta refinement gate passed');
