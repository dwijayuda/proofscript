#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const evidence = path.join(root, 'assurance/lean4331/evidence');
fs.mkdirSync(evidence, { recursive: true });

function run(label, command, args, options = {}) {
  console.log(`K3TB_VERIFY_PHASE_START=${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 15 * 60 * 1000,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  const out = [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('');
  fs.writeFileSync(path.join(evidence, `v71-k3tb-one-command-${label}.out`), out);
  if (result.status !== 0) {
    console.error(out);
    console.error(`K3TB_VERIFY_PHASE_FAIL=${label}`);
    process.exit(result.status ?? 1);
  }
  console.log(`K3TB_VERIFY_PHASE_PASS=${label}`);
  return out;
}

run('lean-env-doctor', process.execPath, ['tools/kernel-v71-k3tb-lean-env-doctor.ts', '--strict'], { timeoutMs: 30_000 });

const lean = process.env.PROOFSCRIPT_LEAN_BIN;
assert.ok(lean, 'strict K3-TB Lean environment doctor passed but PROOFSCRIPT_LEAN_BIN is unavailable');
assert.ok(fs.existsSync(lean), `strict K3-TB Lean environment doctor passed but PROOFSCRIPT_LEAN_BIN does not exist: ${lean}`);
const version = run('lean-version', lean, ['--version'], { timeoutMs: 30_000 });
assert.match(version, /version 4\.33\.1/);
assert.match(version, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);

run('build', 'npm', ['run', 'build']);
run('local-merged', 'npm', ['run', 'test:v71:local-merged']);
run('lean-gate-finalize', 'npm', ['run', 'test:v71:lean-gate:finalize'], { env: { PROOFSCRIPT_LEAN_BIN: lean } });
run('k3tb-release-candidate', 'npm', ['run', 'test:v71:k3tb-release-candidate'], { env: { PROOFSCRIPT_LEAN_BIN: lean } });
run('k3tb-verification-bundle', 'npm', ['run', 'test:v71:k3tb-verification-bundle'], { env: { PROOFSCRIPT_LEAN_BIN: lean } });

console.log('K3TB_ONE_COMMAND_VERIFY_PROGRESS_OVERALL=99.5%');
console.log('K3TB_ONE_COMMAND_VERIFY_STATUS=PASS');
console.log('K3TB_ONE_COMMAND_VERIFY_BOUNDARY=TRUSTED_BOUNDARY_RC_NOT_FULLY_FORMAL_K3');
