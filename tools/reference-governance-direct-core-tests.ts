#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const smokeSource = readFileSync('tools/reference-language-governance-smoke.ts', 'utf8');
assert.match(smokeSource, /from '\.\/pslive-core\.ts'/, 'reference governance smoke should use pslive-core directly');
assert.match(smokeSource, /async function run\(args\)/, 'reference governance run shim should support async core commands');
assert.match(smokeSource, /checkCommand\(file/, 'check command should be routed in-process');
assert.match(smokeSource, /buildJsCommand\(file/, 'build-js command should be routed in-process');
assert.match(smokeSource, /runSmallSource\(file/, 'run command should be routed in-process');

const started = Date.now();
const result = spawnSync(process.execPath, ['tools/reference-language-governance-smoke.ts', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  timeout: 10000,
  killSignal: 'SIGKILL',
  maxBuffer: 1024 * 1024 * 16,
});
const elapsedMs = Date.now() - started;

assert.equal(result.error?.code, undefined, `reference governance smoke should terminate within timeout: ${result.error?.message ?? ''}`);
assert.equal(result.status, 0, `reference governance smoke should accept; stderr=${result.stderr}\nstdout=${result.stdout.slice(0, 1000)}`);
const parsed = JSON.parse(result.stdout);
assert.equal(parsed.status, 'accepted');
assert.equal(parsed.requiredFailureCount, 0);
assert.ok(parsed.checkCount >= 80, `expected broad governance coverage, got ${parsed.checkCount}`);
assert.ok(elapsedMs < 10000, `expected bounded runtime below 10s, got ${elapsedMs}ms`);
console.log(`reference governance direct-core termination PASS checks=${parsed.checkCount} elapsedMs=${elapsedMs}`);
