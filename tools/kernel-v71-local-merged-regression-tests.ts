import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  {
    label: 'O-DECL local environment preservation',
    cmd: [process.execPath, 'tools/kernel-declaration-environment-preservation-tests.ts'],
    needles: ['PASS KERNEL declaration-environment preservation phase 1'],
  },
  {
    label: 'TS non-mutual classifier implementation bridge',
    cmd: [process.execPath, 'tools/kernel-inductive-nonmutual-ts-implementation-correspondence-tests.ts'],
    needles: [
      'TS_CLASSIFIER_SOURCE_OBLIGATIONS=62 MISSING=0',
      'TS_CLASSIFIER_RUNTIME_ACCEPTED=5 REJECTED=4 ATOMIC=4',
      'TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0',
    ],
  },
];

let failures = 0;
for (const check of checks) {
  const [bin, ...args] = check.cmd;
  const r = spawnSync(bin, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env },
  });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (r.status !== 0 || check.needles.some(n => !out.includes(n))) {
    failures += 1;
    console.error(`FAIL ${check.label}`);
    console.error(out);
  } else {
    console.log(`MERGED_LOCAL_COMPONENT PASS ${check.label}`);
  }
}

if (failures !== 0) {
  console.log(`V71_MERGED_LOCAL_COMPONENTS=${checks.length} FAILURES=${failures}`);
  process.exit(1);
}

console.log(`V71_MERGED_LOCAL_COMPONENTS=${checks.length} FAILURES=0`);
console.log('PASS KERNEL-v71-local-merged-regression: O-DECL preservation + TS classifier implementation bridge');
