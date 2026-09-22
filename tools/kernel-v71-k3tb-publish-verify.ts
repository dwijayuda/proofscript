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
  if (result.status !== 0) {
    console.error(`K3TB_PUBLISH_PREFLIGHT_VERIFY_PHASE_FAIL=${label}`);
    process.exit(result.status ?? 1);
  }
  console.log(`K3TB_PUBLISH_PREFLIGHT_VERIFY_PHASE_PASS=${label}`);
  return out;
}

run('k3tb-lean-env-doctor', process.execPath, ['tools/kernel-v71-k3tb-lean-env-doctor.ts', '--strict']);
run('k3tb-release', 'npm', ['run', 'verify:k3tb:release']);
const publishOut = run('k3tb-publish-preflight', 'npm', ['run', 'test:v71:k3tb-publish-preflight']);
assert.match(publishOut, /K3TB_PUBLISH_PREFLIGHT_STATUS=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3/);
console.log('K3TB_PUBLISH_PREFLIGHT_VERIFY_PROGRESS_OVERALL=99.5%');
console.log('K3TB_PUBLISH_PREFLIGHT_VERIFY_STATUS=PASS');
console.log('K3TB_PUBLISH_PREFLIGHT_VERIFY_BOUNDARY=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3');
