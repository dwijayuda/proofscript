#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const status = spawnSync(process.execPath, ['tools/production-status.ts', '--json'], { cwd: root, encoding: 'utf8' });
assert.equal(status.status, 0, `production-status --json must pass
stdout:
${status.stdout}
stderr:
${status.stderr}`);
const parsed = JSON.parse(status.stdout);
const readme = read('README.md');
assert.equal(parsed.release, 'P5.94', 'controlled baseline must report P5.93, not stale earlier P5/P6/v71 identity');
assert.match(pkg.version, /p5\.94-arena-nested-helper-target-validation0/, 'package version must identify the P5.93 nested recursor preflight baseline');
assert.match(readme.slice(0, 1000), /P5.94 Arena Nested Helper Target Validation0/i, 'README lead must identify the P5.93 nested recursor preflight baseline');
assert.doesNotMatch(readme.slice(0, 1000), /Current integration candidate:\s*\*\*PRODUCTION-P6|v71 trusted-boundary K3-TB default kernel/i, 'README lead must not present inherited P6/v71 text as current P5.94 status');
assert.match(readme, /K3-TB trusted-boundary only\. Fully formal K3: NO\. Full Lean 4 equivalence: NO\./, 'README must preserve the K3-TB honesty line');
console.log('✓ P5.94 nested helper target validation baseline consistency holds');
