import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, infer, sameTerm,
  LevelZero, levelParam, levelSucc, levelMax, levelOfNat,
} from '../packages/kernel/dist/index.js';

const S=level=>({tag:'sort',level});
const B=index=>({tag:'bvar',index});
const C=(name,levels=[])=>({tag:'const',name,levels});
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});

function levelS(l){
  switch(l.tag){
    case 'zero': return '0';
    case 'succ': return `(s ${levelS(l.of)})`;
    case 'max': return `(max ${levelS(l.left)} ${levelS(l.right)})`;
    case 'imax': return `(imax ${levelS(l.left)} ${levelS(l.right)})`;
    case 'param': return `(p ${l.name})`;
  }
}
function binderS(bi){return bi==='explicit'?'E':bi==='implicit'?'I':bi==='strictImplicit'?'S':'Inst';}
function exprS(e){
  switch(e.tag){
    case 'bvar': return `(b ${e.index})`;
    case 'sort': return `(sort ${levelS(e.level)})`;
    case 'const': return `(c ${e.name} [${e.levels.map(levelS).join(',')}])`;
    case 'app': return `(a ${exprS(e.fn)} ${exprS(e.arg)})`;
    case 'lam': return `(lam ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;
    case 'pi': return `(pi ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;
    case 'let': return `(let ${e.nondep} ${exprS(e.type)} ${exprS(e.value)} ${exprS(e.body)})`;
    case 'proj': return `(proj ${e.typeName} ${e.index} ${exprS(e.expr)})`;
  }
}
function kindS(d){
  if(d.kind==='axiom') return 'axiom';
  if(d.kind==='definition') return d.reducibility==='abbrev'?'definition:abbrev':'definition:regular:0';
  if(d.kind==='theorem') return 'theorem';
  if(d.kind==='opaque') return 'opaque';
  throw new Error(`not ordinary: ${d.kind}`);
}
function transparentS(d){return d.kind==='definition'?exprS(d.value):'-';}
function declLine(d){return `D|${kindS(d)}|${d.name}|${d.levelParams.join(',')}|${exprS(d.type)}|${transparentS(d)}`;}

const u=levelParam('u'), v=levelParam('v');
const idType=Pi(S(u),Pi(B(0),B(1)));
const idValue=Lam(S(u),Lam(B(0),B(0)));
const decls=[
  {kind:'axiom',name:'KADecl.Mix',levelParams:['u','v'],type:S(levelMax(u,v))},
  {kind:'definition',name:'KADecl.IdReg',levelParams:['u'],type:idType,value:idValue,reducibility:'regular'},
  {kind:'definition',name:'KADecl.IdAbb',levelParams:['u'],type:idType,value:idValue,reducibility:'abbrev'},
  {kind:'opaque',name:'KADecl.IdOpaque',levelParams:['u'],type:idType,value:idValue},
  {kind:'axiom',name:'KADecl.P',levelParams:[],type:S(LevelZero)},
  {kind:'axiom',name:'KADecl.p',levelParams:[],type:C('KADecl.P')},
  {kind:'theorem',name:'KADecl.Thm',levelParams:[],type:C('KADecl.P'),value:C('KADecl.p')},
];

const env=new Environment();
for(const d of decls) checkAndAddDeclaration(env,d);
const tsDeclLines=decls.map(declLine);
const instLines=[];
let cases=0, failures=0;
function record(term){
  try { const actual=infer(env,[],term); instLines.push(`I|${cases}|${exprS(actual)}`); }
  catch(e){ failures++; instLines.push(`I|${cases}|ERROR:${e?.message??e}`); }
  cases++;
}
for(let i=0;i<400;i++) record(C('KADecl.Mix',[levelOfNat(i%6),levelOfNat((i*5+1)%7)]));
for(let i=0;i<450;i++) {
  const n=i%3===0?'KADecl.IdReg':i%3===1?'KADecl.IdAbb':'KADecl.IdOpaque';
  record(C(n,[levelOfNat(i%7)]));
}
for(let i=0;i<150;i++) {
  const n=i%3===0?'KADecl.P':i%3===1?'KADecl.p':'KADecl.Thm';
  record(C(n));
}
assert.equal(cases,1000); assert.equal(failures,0);
const before=env.get('KADecl.Mix'); let duplicateRejected=false;
try { checkAndAddDeclaration(env,{kind:'axiom',name:'KADecl.Mix',levelParams:[],type:S(LevelZero)}); } catch { duplicateRejected=true; }
assert.equal(duplicateRejected,true);
assert.equal(env.get('KADecl.Mix'),before,'failed duplicate changed existing declaration identity');

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(!lean) throw new Error('PROOFSCRIPT_LEAN_BIN is required for exact ordinary declaration differential');
const fixture=new URL('../assurance/lean4331/evidence/DeclarationOrdinaryNativeDifferential.lean',import.meta.url).pathname;
const r=spawnSync(lean,[fixture],{encoding:'utf8',maxBuffer:32*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanDeclLines=r.stdout.split(/\r?\n/).filter(l=>l.startsWith('D|'));
const leanInstLines=r.stdout.split(/\r?\n/).filter(l=>l.startsWith('I|'));
assert.deepEqual(leanDeclLines,tsDeclLines,'ordinary declaration ConstantInfo structures differ from exact Lean 4.33.1');
assert.equal(leanInstLines.length,1000);
assert.deepEqual(leanInstLines,instLines,'ordinary declaration instantiated type lookup differs from exact Lean 4.33.1');
assert.match(r.stdout,/ORDINARY_DECL_NATIVE_CASES=1000 FAILURES=0 KERNEL_CHECKS=1000 DUPLICATE_REJECTED=true/);
console.log(`ORDINARY_DECL_STRUCTURAL_LINES=${tsDeclLines.length} MISMATCHES=0`);
console.log(`ORDINARY_DECL_INSTANTIATION_CASES=${cases} MISMATCHES=0`);
console.log(`ORDINARY_DECL_DUPLICATE_REJECTED=${duplicateRejected}`);
console.log('PASS KERNEL-declaration-ordinary-differential exact Lean 4.33.1');
