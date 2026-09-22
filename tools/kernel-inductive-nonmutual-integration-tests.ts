import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
if (!env.PROOFSCRIPT_LEAN_BIN) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for the exact non-mutual integration bridge');
  process.exit(1);
}

function run(label, rel, needles) {
  const r = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (r.status !== 0) {
    console.error(`--- ${label} failed ---`);
    console.error(out);
    process.exit(1);
  }
  for (const needle of needles) assert.match(out, needle, `${label}: missing ${needle}`);
  return out;
}

const universe = run('field-universe admission', 'tools/kernel-inductive-universe-tests.ts', [
  /constructor-field universe ceilings/,
  /exact Lean differential/,
]);
const uniform = run('uniform-parameter defEq', 'tools/kernel-uniform-parameter-defeq-tests.ts', [
  /uniform-parameter definitional equality/,
  /exact Lean observations passed/,
]);
const direct = run('direct inductive admission', 'tools/kernel-inductive-direct-admission-differential-tests.ts', [
  /INDUCTIVE_DIRECT_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4/,
  /INDUCTIVE_DIRECT_STRUCTURAL_LINES=18 MISMATCHES=0/,
]);
const indexed = run('parameterized/indexed admission', 'tools/kernel-inductive-indexed-admission-differential-tests.ts', [
  /INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6/,
  /INDUCTIVE_INDEXED_STRUCTURAL_LINES=19 MISMATCHES=0/,
]);
const indexedIota = run('indexed iota WHNF', 'tools/kernel-inductive-indexed-iota-differential-tests.ts', [
  /INDUCTIVE_INDEXED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6/,
]);

console.log('NONMUTUAL_INTEGRATION_FIELD_UNIVERSE=PASS');
console.log('NONMUTUAL_INTEGRATION_UNIFORM_PARAM_DEFEQ=PASS');
console.log('NONMUTUAL_INTEGRATION_DIRECT=6P_4N_18STRUCT_0MISMATCH');
console.log('NONMUTUAL_INTEGRATION_INDEXED=6P_6N_19STRUCT_0MISMATCH');
console.log('NONMUTUAL_INTEGRATION_INDEXED_IOTA=6WHNF_0MISMATCH');
console.log('NONMUTUAL_INTEGRATION_FAILURES=0');
console.log('PASS KERNEL-inductive-nonmutual-integration exact Lean 4.33.1');
