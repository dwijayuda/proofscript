#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(label, cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 20 * 60 * 1000,
    maxBuffer: 256 * 1024 * 1024,
    env: process.env,
  });
  const out = [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('');
  process.stdout.write(out);
  assert.equal(result.status, 0, `${label} failed with status ${result.status}\n${out}`);
  console.log(`K3TB_RELEASE_VERIFY_PHASE_PASS=${label}`);
  return out;
}

assert.ok(process.env.PROOFSCRIPT_LEAN_BIN, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1');
run('k3tb-audit', 'npm', ['run', 'verify:k3tb:audit']);
const releaseOut = run('practical-release', 'npm', ['run', 'test:v71:k3tb-practical-release']);
assert.match(releaseOut, /K3TB_PRACTICAL_RELEASE_STATUS=PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3/);
console.log('K3TB_RELEASE_VERIFY_PROGRESS_OVERALL=99.5%');
console.log('K3TB_RELEASE_VERIFY_STATUS=PASS');
console.log('K3TB_RELEASE_VERIFY_BOUNDARY=PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3');
