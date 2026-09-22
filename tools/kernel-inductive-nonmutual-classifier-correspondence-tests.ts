import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'assurance/lean4331/evidence');
const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (!lean) {
  console.error('PROOFSCRIPT_LEAN_BIN is required for the exact non-mutual classifier correspondence bridge');
  process.exit(1);
}

function expect(text, needle, label) { assert.match(text, needle, `${label}: missing ${needle}`); }
function readEvidence(name) { return fs.readFileSync(path.join(evidence, name), 'utf8'); }
function runVector() {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/kernel-inductive-nonmutual-classifier-vectors.ts')], {
    cwd: root,
    env: { ...process.env, PROOFSCRIPT_LEAN_BIN: lean },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (r.status !== 0) {
    console.error(out);
    process.exit(1);
  }
  return out;
}

const vector = runVector();
expect(vector, /CLASSIFIER_VECTOR_POSITIVE=5/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_NEGATIVE=4/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_PROP_EXEMPTION=1/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_WHNF_DEFEQ_CASES=3/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_HIGHER_ORDER_POINTWISE_IH=1/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_ATOMIC_REJECTIONS=4/, 'classifier vector');
expect(vector, /CLASSIFIER_VECTOR_FAILURES=0/, 'classifier vector');

const generic = readEvidence('v71-generic-nonmutual-admission1.out');
expect(generic, /GENERIC_NONMUTUAL_ADMISSION_FAILURES=0/, 'generic non-mutual admission evidence');
expect(generic, /GENERIC_NONMUTUAL_FORMAL_BOUNDARY=raw_ctor_types_to_checked_constructor_body_admission/, 'generic non-mutual formal boundary');

const integration = readEvidence('v71-nonmutual-gate-part6.out');
expect(integration, /PASS: non-mutual integration: field-universe \+ uniform-param defEq \+ direct\/indexed admission \+ indexed iota/, 'non-mutual integration evidence');

const recgen = readEvidence('v71-recursor-nonmutual-generated1.out');
expect(recgen, /NONMUTUAL_RECURSOR_GENERATED_FAILURES=0/, 'generated recursor evidence');
expect(recgen, /NONMUTUAL_RECURSOR_GENERATED_STRUCTURAL_RECORDS=37 DIRECT_RECORDS=18 INDEXED_RECORDS=19 MISMATCHES=0/, 'generated recursor structural evidence');
expect(recgen, /NONMUTUAL_RECURSOR_GENERATED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6/, 'generated recursor iota evidence');

const envInd = readEvidence('v71-nonmutual-env-induction1.out');
expect(envInd, /NONMUTUAL_ENV_INDUCTION_COMPONENTS=6 FAILURES=0/, 'whole-environment induction evidence');

console.log('NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0');
console.log('NONMUTUAL_CLASSIFIER_VECTOR_BOUNDARY=5P_4N_1PROP_3DEFEQ_1HO_4ATOMIC');
console.log('NONMUTUAL_CLASSIFIER_GENERIC_ADMISSION=PASS');
console.log('NONMUTUAL_CLASSIFIER_GENERATED_RECURSORS=37STRUCT_6WHNF_0MISMATCH');
console.log('NONMUTUAL_CLASSIFIER_ENV_INDUCTION=6_COMPONENTS_PASS');
console.log('PASS KERNEL-inductive-nonmutual-classifier-correspondence exact Lean 4.33.1');
