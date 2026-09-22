import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for the exact generic non-mutual admission bridge');
  process.exit(1);
}

function run(label, rel, needles) {
  const r = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    env: { ...process.env, PROOFSCRIPT_LEAN_BIN: lean },
    encoding: 'utf8',
    timeout: 240_000,
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

run('non-mutual integrated admission', 'tools/kernel-inductive-nonmutual-integration-tests.ts', [
  /NONMUTUAL_INTEGRATION_FAILURES=0/,
  /NONMUTUAL_INTEGRATION_DIRECT=6P_4N_18STRUCT_0MISMATCH/,
  /NONMUTUAL_INTEGRATION_INDEXED=6P_6N_19STRUCT_0MISMATCH/,
]);
run('generated recursor bridge', 'tools/kernel-recursor-nonmutual-generated-tests.ts', [
  /NONMUTUAL_RECURSOR_GENERATED_FAILURES=0/,
  /NONMUTUAL_RECURSOR_GENERATED_STRUCTURAL_RECORDS=37 DIRECT_RECORDS=18 INDEXED_RECORDS=19 MISMATCHES=0/,
  /NONMUTUAL_RECURSOR_GENERATED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6/,
]);
run('whole-environment induction bridge', 'tools/kernel-nonmutual-environment-induction-tests.ts', [
  /NONMUTUAL_ENV_INDUCTION_COMPONENTS=6 FAILURES=0/,
]);

console.log('GENERIC_NONMUTUAL_FORMAL_BOUNDARY=raw_ctor_types_to_checked_constructor_body_admission');
console.log('GENERIC_NONMUTUAL_INHERITED_DIRECT=6P_4N_18STRUCT_0MISMATCH');
console.log('GENERIC_NONMUTUAL_INHERITED_INDEXED=6P_6N_19STRUCT_0MISMATCH');
console.log('GENERIC_NONMUTUAL_INHERITED_RECURSOR=37STRUCT_6WHNF_0MISMATCH');
console.log('GENERIC_NONMUTUAL_INHERITED_ENV_COMPONENTS=6');
console.log('GENERIC_NONMUTUAL_ADMISSION_FAILURES=0');
console.log('PASS KERNEL-inductive-nonmutual-generic-admission exact Lean 4.33.1');
