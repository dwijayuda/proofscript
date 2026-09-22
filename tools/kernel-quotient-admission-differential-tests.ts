import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, generateQuotientPrimitives,
  expectedEqType, expectedEqReflType, levelOfNat,
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=level=>({tag:'sort',level});
function levelS(l){switch(l.tag){case'zero':return'0';case'succ':return`(s ${levelS(l.of)})`;case'max':return`(max ${levelS(l.left)} ${levelS(l.right)})`;case'imax':return`(imax ${levelS(l.left)} ${levelS(l.right)})`;case'param':return`(p ${l.name})`;}}
function binderS(bi){return bi==='explicit'?'E':bi==='implicit'?'I':bi==='strictImplicit'?'S':'Inst';}
function exprS(e){switch(e.tag){case'bvar':return`(b ${e.index})`;case'sort':return`(sort ${levelS(e.level)})`;case'const':return`(c ${e.name} [${e.levels.map(levelS).join(',')}])`;case'app':return`(a ${exprS(e.fn)} ${exprS(e.arg)})`;case'lam':return`(lam ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'pi':return`(pi ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'let':return`(let ${e.nondep} ${exprS(e.type)} ${exprS(e.value)} ${exprS(e.body)})`;case'proj':return`(proj ${e.typeName} ${e.index} ${exprS(e.expr)})`;}}
const kindMap={type:'type',mk:'ctor',lift:'lift',ind:'ind'};
function qLine(q){return `QF|${q.name}|${q.levelParams.join(',')}|${kindMap[q.quotKind]}|${exprS(q.type)}`;}
function canonicalEq(){return {kind:'inductive',name:'Eq',levelParams:['u'],type:expectedEqType('u'),numParams:2,numIndices:1,constructors:[{name:'Eq.refl',type:expectedEqReflType('u')}]};}
function quotientNamesPresent(env){return ['Quot','Quot.mk','Quot.lift','Quot.ind'].filter(n=>env.has(n));}

// Positive fresh installation.
const good=new Environment();
checkAndAddDeclaration(good,canonicalEq());
const checked=checkAndAddDeclaration(good,{kind:'quot',name:'Quot',levelParams:[]});
assert.deepEqual(checked.generated,['Quot','Quot.mk','Quot.lift','Quot.ind']);
const tsLines=['Quot','Quot.mk','Quot.lift','Quot.ind'].map(n=>{
  const e=good.get(n); assert(e && e.declaration.kind==='quotient'); return qLine(e.declaration);
});
assert.deepEqual(tsLines,generateQuotientPrimitives().map(q=>`QF|${q.name}|${q.levelParams.join(',')}|${kindMap[q.quotKind]}|${exprS(q.type)}`));

let negative=0;
// No Eq.
{
  const env=new Environment(); let rejected=false;
  try{checkAndAddDeclaration(env,{kind:'quot',name:'Quot',levelParams:[]});}catch{rejected=true;}
  assert(rejected); assert.deepEqual(quotientNamesPresent(env),[]); negative++;
}
// Non-inductive Eq.
{
  const env=new Environment(); checkAndAddDeclaration(env,{kind:'axiom',name:'Eq',levelParams:[],type:S(L0)}); let rejected=false;
  try{checkAndAddDeclaration(env,{kind:'quot',name:'Quot',levelParams:[]});}catch{rejected=true;}
  assert(rejected); assert.deepEqual(quotientNamesPresent(env),[]); negative++;
}
// Eq-like metadata without Eq.refl: install malformed checked metadata directly to isolate quotient precondition.
{
  const env=new Environment();
  const eq=canonicalEq(); eq.constructors=[];
  checkAndAddDeclaration(env, eq); let rejected=false;
  try{checkAndAddDeclaration(env,{kind:'quot',name:'Quot',levelParams:[]});}catch{rejected=true;}
  assert(rejected); assert.deepEqual(quotientNamesPresent(env),[]); negative++;
}
// Collision: Quot preexists, no tail primitive may leak.
{
  const env=new Environment(); checkAndAddDeclaration(env,canonicalEq()); checkAndAddDeclaration(env,{kind:'axiom',name:'Quot',levelParams:[],type:S(L1)}); let rejected=false;
  try{checkAndAddDeclaration(env,{kind:'quot',name:'Quot',levelParams:[]});}catch{rejected=true;}
  assert(rejected); assert.deepEqual(quotientNamesPresent(env),['Quot']); negative++;
}
assert.equal(negative,4);

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(!lean) throw new Error('PROOFSCRIPT_LEAN_BIN is required');
const fixture=new URL('../assurance/lean4331/evidence/QuotientAdmissionNativeDifferential.lean',import.meta.url).pathname;
const r=spawnSync(lean,['--run',fixture],{encoding:'utf8',maxBuffer:32*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanLines=r.stdout.split(/\r?\n/).filter(l=>l.startsWith('QF|'));
assert.deepEqual(leanLines,tsLines,'fresh quotient installation structures differ from exact Lean .quotDecl');
assert.match(r.stdout,/QUOT_ADMISSION_NATIVE_POSITIVE=1 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4/);
console.log('QUOT_ADMISSION_STRUCTURAL_LINES=4 MISMATCHES=0');
console.log('QUOT_ADMISSION_POSITIVE=1 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4');
console.log('PASS KERNEL-quotient-admission-differential exact fresh Lean .quotDecl');
