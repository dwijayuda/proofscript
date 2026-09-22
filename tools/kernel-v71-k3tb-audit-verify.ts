#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
const evidence = path.join(root, 'assurance/lean4331/evidence');
fs.mkdirSync(evidence, { recursive: true });

function run(label, command, args, options = {}) {
  console.log(`K3TB_AUDIT_VERIFY_PHASE_START=${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 15 * 60 * 1000,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  const out = [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('');
  fs.writeFileSync(path.join(evidence, `v71-k3tb-audit-verify-${label}.out`), out);
  if (result.status !== 0) {
    console.error(out);
  }
  assert.equal(result.status, 0, `${label} failed with status ${result.status}`);
  console.log(`K3TB_AUDIT_VERIFY_PHASE_PASS=${label}`);
  return out;
}

assert.ok(lean, 'PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1');
assert.ok(fs.existsSync(lean), `PROOFSCRIPT_LEAN_BIN does not exist: ${lean}`);

run('k3tb-one-command', 'npm', ['run', 'verify:k3tb'], {
  env: { PROOFSCRIPT_LEAN_BIN: lean },
  timeoutMs: 25 * 60 * 1000,
});
run('independent-audit-pack', 'npm', ['run', 'test:v71:k3tb-independent-audit-pack'], {
  env: { PROOFSCRIPT_LEAN_BIN: lean },
  timeoutMs: 15 * 60 * 1000,
});

console.log('K3TB_AUDIT_ONE_COMMAND_PROGRESS_OVERALL=99.5%');
console.log('K3TB_AUDIT_ONE_COMMAND_STATUS=PASS');
console.log('K3TB_AUDIT_ONE_COMMAND_BOUNDARY=INDEPENDENT_AUDIT_PACK_NOT_FULLY_FORMAL_K3');
