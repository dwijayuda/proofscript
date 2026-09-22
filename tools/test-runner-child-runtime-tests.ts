#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const runner = path.join(root, 'tools/test-runner.ts');
const r = spawnSync(process.execPath, [
  '--experimental-strip-types',
  '--disable-warning=ExperimentalWarning',
  '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
  runner
], {
  cwd: root,
  encoding: 'utf8',
  timeout: 30000,
  env: { ...process.env, PROOFSCRIPT_TEST_RUNNER_CHILD_SMOKE: '1', TERM: 'xterm' }
});

const output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
assert.equal(r.status, 0, `test-runner child runtime smoke must pass; output:\n${output}`);
assert.ok(!output.includes('ERR_UNKNOWN_FILE_EXTENSION'), 'child TypeScript entry points must inherit Node strip-types flags');
console.log('✓ test-runner child TypeScript runtime propagation passed');
