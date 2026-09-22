import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const env={...process.env};

function runNode(script){
  const r=spawnSync(process.execPath,[path.join(root,'tools',script)],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,env});
  const text=`${r.stdout??''}${r.stderr??''}`;
  assert.equal(r.status,0,`${script} failed\n${text}`);
  return text;
}

function expect(text, needle, label){
  assert.ok(text.includes(needle),`${label} missing ${needle}\n${text}`);
}

const direct=runNode('kernel-inductive-direct-admission-differential-tests.ts');
expect(direct,'INDUCTIVE_DIRECT_STRUCTURAL_LINES=18 MISMATCHES=0','direct structural records');
expect(direct,'INDUCTIVE_DIRECT_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4','direct admission');

const indexed=runNode('kernel-inductive-indexed-admission-differential-tests.ts');
expect(indexed,'INDUCTIVE_INDEXED_STRUCTURAL_LINES=19 MISMATCHES=0','indexed structural records');
expect(indexed,'INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6','indexed admission');

const iota=runNode('kernel-inductive-indexed-iota-differential-tests.ts');
expect(iota,'INDUCTIVE_INDEXED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6','indexed extensional iota');

const familyBinder=runNode('kernel-recursor-family-binder-info-tests.ts');
expect(familyBinder,'recursor family BinderInfo policy','recursor family-binder smoke');

const dependent=runNode('kernel-dependent-indexed-recursor-completion-tests.ts');
expect(dependent,'non-mutual dependent/indexed recursor audit','dependent indexed recursor completion');

console.log('NONMUTUAL_RECURSOR_GENERATED_STRUCTURAL_RECORDS=37 DIRECT_RECORDS=18 INDEXED_RECORDS=19 MISMATCHES=0');
console.log('NONMUTUAL_RECURSOR_GENERATED_ADMISSION_POSITIVE=12 NEGATIVE=10 FAILURES=0 ATOMIC_FAILURES=10');
console.log('NONMUTUAL_RECURSOR_GENERATED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6');
console.log('NONMUTUAL_RECURSOR_GENERATED_FAILURES=0');
console.log('PASS KERNEL-recursor-nonmutual-generated exact Lean 4.33.1');
