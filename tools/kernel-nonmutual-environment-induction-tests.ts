import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for exact Lean 4.33.1 bridges');
  process.exit(1);
}

const checks = [
  {
    label: 'ordinary declaration/environment',
    cmd: [process.execPath, 'tools/kernel-declaration-ordinary-differential-tests.ts'],
    needles: ['ORDINARY_DECL_INSTANTIATION_CASES=1000 MISMATCHES=0'],
  },
  {
    label: 'fresh quotient admission',
    cmd: [process.execPath, 'tools/kernel-quotient-admission-differential-tests.ts'],
    needles: ['QUOT_ADMISSION_POSITIVE=1 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4'],
  },
  {
    label: 'direct inductive admission',
    cmd: [process.execPath, 'tools/kernel-inductive-direct-admission-differential-tests.ts'],
    needles: ['INDUCTIVE_DIRECT_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4', 'INDUCTIVE_DIRECT_STRUCTURAL_LINES=18 MISMATCHES=0'],
  },
  {
    label: 'parameterized/indexed inductive admission',
    cmd: [process.execPath, 'tools/kernel-inductive-indexed-admission-differential-tests.ts'],
    needles: ['INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6', 'INDUCTIVE_INDEXED_STRUCTURAL_LINES=19 MISMATCHES=0'],
  },
  {
    label: 'non-mutual integrated admission predicates',
    cmd: [process.execPath, 'tools/kernel-inductive-nonmutual-integration-tests.ts'],
    needles: ['NONMUTUAL_INTEGRATION_FAILURES=0'],
  },
  {
    label: 'generated recursor structural/extensional bridge',
    cmd: [process.execPath, 'tools/kernel-recursor-nonmutual-generated-tests.ts'],
    needles: ['NONMUTUAL_RECURSOR_GENERATED_FAILURES=0'],
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
    env: { ...process.env, PROOFSCRIPT_LEAN_BIN: lean },
  });
  const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (r.status !== 0 || check.needles.some(n => !text.includes(n))) {
    failures += 1;
    console.error(`FAIL ${check.label}`);
    console.error(text);
  } else {
    console.log(`ENV_INDUCTION_COMPONENT PASS ${check.label}`);
  }
}

if (failures !== 0) {
  console.log(`NONMUTUAL_ENV_INDUCTION_COMPONENTS=${checks.length} FAILURES=${failures}`);
  process.exit(1);
}

console.log(`NONMUTUAL_ENV_INDUCTION_COMPONENTS=${checks.length} FAILURES=0`);
console.log('PASS KERNEL-nonmutual-environment-induction exact Lean 4.33.1');
