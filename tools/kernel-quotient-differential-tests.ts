import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateQuotientPrimitives, Environment, checkAndAddDeclaration, expectedEqType, expectedEqReflType, infer, kernelWhnf, defEq, levelOfNat } from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Arrow=(domain,body)=>Pi(domain,body,'explicit');

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
const kindMap={type:'type',mk:'ctor',lift:'lift',ind:'ind'};
const tsLines=generateQuotientPrimitives().map(q=>`Q|${q.name}|${q.levelParams.join(',')}|${kindMap[q.quotKind]}|${exprS(q.type)}`);

function exactEq(){
  return {kind:'inductive',name:'Eq',levelParams:['u'],type:expectedEqType('u'),numParams:2,numIndices:1,constructors:[{name:'Eq.refl',type:expectedEqReflType('u')}]};
}
const env=new Environment(); checkAndAddDeclaration(env,exactEq()); checkAndAddDeclaration(env,{kind:'quot',name:'Quot',levelParams:[]});
checkAndAddDeclaration(env,{kind:'axiom',name:'A',levelParams:[],type:S(L1)});
for(let i=0;i<500;i++) checkAndAddDeclaration(env,{kind:'axiom',name:`a${i}`,levelParams:[],type:C('A')});
const A=C('A'), eqA=Apps(C('Eq',[L1]),[A]);
const idA=Lam(A,B(0));
const sound=Lam(A,Lam(A,Lam(Apps(eqA,[B(1),B(0)]),B(0))));
let liftFailures=0, indFailures=0;
for(let i=0;i<250;i++){
  const rep=C(`a${i}`); const major=Apps(C('Quot.mk',[L1]),[A,eqA,rep]);
  const lift=Apps(C('Quot.lift',[L1,L1]),[A,eqA,A,idA,sound,major]);
  try{ if(!defEq(env,[],infer(env,[],lift),A)||!defEq(env,[],kernelWhnf(env,lift),rep)) liftFailures++; }catch{liftFailures++;}
  const eqRep=Apps(C('Eq',[L1]),[A,rep,rep]);
  const motive=Lam(Apps(C('Quot',[L1]),[A,eqA]),eqRep);
  const refl=Apps(C('Eq.refl',[L1]),[A,rep]);
  const witness=Lam(A,refl);
  const ind=Apps(C('Quot.ind',[L1]),[A,eqA,motive,witness,major]);
  try{ if(!defEq(env,[],infer(env,[],ind),eqRep)||!defEq(env,[],kernelWhnf(env,ind),refl)) indFailures++; }catch{indFailures++;}
}
const beta=Arrow(A,A), idBody=Lam(A,B(0)), f2=Lam(A,idBody);
const reflFn=Apps(C('Eq.refl',[L1]),[beta,idBody]);
const sound2=Lam(A,Lam(A,Lam(Apps(eqA,[B(1),B(0)]),reflFn)));
for(let i=250;i<500;i++){
  const rep=C(`a${i}`); const major=Apps(C('Quot.mk',[L1]),[A,eqA,rep]);
  const lift=Apps(C('Quot.lift',[L1,L1]),[A,eqA,beta,f2,sound2,major,rep]);
  try{ if(!defEq(env,[],infer(env,[],lift),A)||!defEq(env,[],kernelWhnf(env,lift),rep)) liftFailures++; }catch{liftFailures++;}
  const eqRep=Apps(C('Eq',[L1]),[A,rep,rep]);
  const motive=Lam(Apps(C('Quot',[L1]),[A,eqA]),Arrow(A,eqRep));
  const refl=Apps(C('Eq.refl',[L1]),[A,rep]);
  const witness=Lam(A,Lam(A,refl));
  const ind=Apps(C('Quot.ind',[L1]),[A,eqA,motive,witness,major,rep]);
  try{ if(!defEq(env,[],infer(env,[],ind),eqRep)||!defEq(env,[],kernelWhnf(env,ind),refl)) indFailures++; }catch{indFailures++;}
}
console.log(tsLines.join('\n'));
console.log(`QUOT_TS_LIFT=500 IND=500 LIFT_FAILURES=${liftFailures} IND_FAILURES=${indFailures}`);
assert.equal(liftFailures,0); assert.equal(indFailures,0);

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const fixture=new URL('../assurance/lean4331/evidence/QuotientNativeDifferential.lean',import.meta.url).pathname;
  const r=spawnSync(lean,[fixture],{encoding:'utf8'});
  if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
  const leanLines=r.stdout.split(/\r?\n/).filter(x=>x.startsWith('Q|'));
  assert.deepEqual(leanLines,tsLines,'ProofScript quotient primitive structures differ from exact Lean 4.33.1');
  assert.match(r.stdout,/QUOT_NATIVE_LIFT=500 IND=500 LIFT_FAILURES=0 IND_FAILURES=0 KERNEL_CHECKS=1000/);
  console.log('QUOT_STRUCTURAL_LINES=4 MISMATCHES=0');
  console.log('✓ exact Lean 4.33.1 quotient structural + computation differential passed');
}
console.log('✓ ProofScript v70 quotient differential passed');
