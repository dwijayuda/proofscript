import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Environment, checkAndAddDeclaration, kernelWhnf, levelOfNat } from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});

const opts={
  recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,
  allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,
  allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,
  allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,
  allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,
  allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,
  allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,
  allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,
  allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,
  allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,
  allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,
  allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,
  allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,
  allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true,
  allowMutualNestedDeeperDependentContainerParameters:true,allowMutualNestedDeeperMultipleFields:true,
  allowMutualNestedDeeperMultipleRecursiveParameterSlots:true,allowMutualNestedFinalGeneralizationAudit:true,
  allowConversionFinalAudit:true,allowResourceBounds:true,allowProjectionConformance:true,
};
function levelS(l){switch(l.tag){case'zero':return'0';case'succ':return`(s ${levelS(l.of)})`;case'max':return`(max ${levelS(l.left)} ${levelS(l.right)})`;case'imax':return`(imax ${levelS(l.left)} ${levelS(l.right)})`;case'param':return`(p ${l.name})`;}}
function binderS(b){return b==='explicit'?'E':b==='implicit'?'I':b==='strictImplicit'?'S':'Inst';}
function exprS(e){switch(e.tag){case'bvar':return`(b ${e.index})`;case'sort':return`(sort ${levelS(e.level)})`;case'const':return`(c ${e.name} [${e.levels.map(levelS).join(',')}])`;case'app':return`(a ${exprS(e.fn)} ${exprS(e.arg)})`;case'lam':return`(lam ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'pi':return`(pi ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'let':return`(let ${e.nondep} ${exprS(e.type)} ${exprS(e.value)} ${exprS(e.body)})`;case'proj':return`(proj ${e.typeName} ${e.index} ${exprS(e.expr)})`;}}

const env=new Environment(opts);
const decls=[
  {kind:'axiom',name:'KAIdxIota.J',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'KAIdxIota.j0',levelParams:[],type:C('KAIdxIota.J')},
  {kind:'axiom',name:'KAIdxIota.j1',levelParams:[],type:C('KAIdxIota.J')},
  {kind:'axiom',name:'KAIdxIota.K',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'KAIdxIota.k0',levelParams:[],type:C('KAIdxIota.K')},
  {kind:'axiom',name:'KAIdxIota.k1',levelParams:[],type:C('KAIdxIota.K')},
  {kind:'axiom',name:'KAIdxIota.F',levelParams:[],type:Pi(C('KAIdxIota.J'),S(L1))},
  {kind:'axiom',name:'KAIdxIota.N',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'KAIdxIota.n0',levelParams:[],type:C('KAIdxIota.N')},
  {kind:'axiom',name:'KAIdxIota.Alpha',levelParams:[],type:S(L1)},
  {kind:'inductive',name:'KAIdxIota.I',levelParams:[],type:Pi(C('KAIdxIota.J'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'KAIdxIota.I.at0',type:Apps(C('KAIdxIota.I'),[C('KAIdxIota.j0')])},
    {name:'KAIdxIota.I.step',type:Pi(Apps(C('KAIdxIota.I'),[C('KAIdxIota.j0')]),Apps(C('KAIdxIota.I'),[C('KAIdxIota.j1')]))},
  ]},
  {kind:'inductive',name:'KAIdxIota.IX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdxIota.J'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'KAIdxIota.IX.step',type:Pi(S(L1),Pi(Apps(C('KAIdxIota.IX'),[B(0),C('KAIdxIota.j0')]),Apps(C('KAIdxIota.IX'),[B(1),C('KAIdxIota.j1')])))},
  ]},
  {kind:'inductive',name:'KAIdxIota.DI',levelParams:[],type:Pi(S(L1),Pi(C('KAIdxIota.J'),Pi(App(C('KAIdxIota.F'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
    {name:'KAIdxIota.DI.mk',type:Pi(S(L1),Pi(C('KAIdxIota.J'),Pi(App(C('KAIdxIota.F'),B(0)),Pi(Apps(C('KAIdxIota.DI'),[B(2),B(1),B(0)]),Apps(C('KAIdxIota.DI'),[B(3),B(2),B(1)])))))}
  ]},
  {kind:'inductive',name:'KAIdxIota.HOIX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdxIota.J'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'KAIdxIota.HOIX.mk',type:Pi(S(L1),Pi(Pi(C('KAIdxIota.N'),Apps(C('KAIdxIota.HOIX'),[B(1),C('KAIdxIota.j0')])),Apps(C('KAIdxIota.HOIX'),[B(1),C('KAIdxIota.j1')])))},
  ]},
  {kind:'inductive',name:'KAIdxIota.MIX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdxIota.J'),Pi(C('KAIdxIota.K'),S(L1)))),numParams:1,numIndices:2,constructors:[
    {name:'KAIdxIota.MIX.step',type:Pi(S(L1),Pi(Apps(C('KAIdxIota.MIX'),[B(0),C('KAIdxIota.j0'),C('KAIdxIota.k0')]),Pi(Apps(C('KAIdxIota.MIX'),[B(1),C('KAIdxIota.j0'),C('KAIdxIota.k1')]),Apps(C('KAIdxIota.MIX'),[B(2),C('KAIdxIota.j1'),C('KAIdxIota.k1')]))))},
  ]},
  {kind:'inductive',name:'KAIdxIota.EqX',levelParams:['u'],type:Pi(S({tag:'param',name:'u'}),Pi(B(0),Pi(B(1),S(L0)))),numParams:2,numIndices:1,constructors:[
    {name:'KAIdxIota.EqX.refl',type:Pi(S({tag:'param',name:'u'}),Pi(B(0),Apps(C('KAIdxIota.EqX',[{tag:'param',name:'u'}]),[B(1),B(0),B(0)])))}
  ]},
  {kind:'axiom',name:'KAIdxIota.i0',levelParams:[],type:Apps(C('KAIdxIota.I'),[C('KAIdxIota.j0')])},
  {kind:'axiom',name:'KAIdxIota.xIX',levelParams:[],type:Apps(C('KAIdxIota.IX'),[C('KAIdxIota.Alpha'),C('KAIdxIota.j0')])},
  {kind:'axiom',name:'KAIdxIota.x0',levelParams:[],type:App(C('KAIdxIota.F'),C('KAIdxIota.j0'))},
  {kind:'axiom',name:'KAIdxIota.d0',levelParams:[],type:Apps(C('KAIdxIota.DI'),[C('KAIdxIota.Alpha'),C('KAIdxIota.j0'),C('KAIdxIota.x0')])},
  {kind:'axiom',name:'KAIdxIota.fHO',levelParams:[],type:Pi(C('KAIdxIota.N'),Apps(C('KAIdxIota.HOIX'),[C('KAIdxIota.Alpha'),C('KAIdxIota.j0')]))},
  {kind:'axiom',name:'KAIdxIota.m0',levelParams:[],type:Apps(C('KAIdxIota.MIX'),[C('KAIdxIota.Alpha'),C('KAIdxIota.j0'),C('KAIdxIota.k0')])},
  {kind:'axiom',name:'KAIdxIota.m1',levelParams:[],type:Apps(C('KAIdxIota.MIX'),[C('KAIdxIota.Alpha'),C('KAIdxIota.j0'),C('KAIdxIota.k1')])},
  {kind:'axiom',name:'KAIdxIota.a0',levelParams:[],type:C('KAIdxIota.Alpha')},
];
for(const d of decls) checkAndAddDeclaration(env,d);

const J=C('KAIdxIota.J'),j0=C('KAIdxIota.j0'),j1=C('KAIdxIota.j1'),K=C('KAIdxIota.K'),k0=C('KAIdxIota.k0'),k1=C('KAIdxIota.k1'),F=C('KAIdxIota.F'),N=C('KAIdxIota.N'),n0=C('KAIdxIota.n0'),Alpha=C('KAIdxIota.Alpha');
const lines=[];
function record(id,e){lines.push(`IOTA|${id}|${exprS(kernelWhnf(env,e))}`);}

const iMotive=Lam(J,Lam(Apps(C('KAIdxIota.I'),[B(0)]),N));
const iMinor0=n0;
const iFieldTy=Apps(C('KAIdxIota.I'),[j0]);
const iMinorStep=Lam(iFieldTy,Lam(N,B(0)));
const iMajor=Apps(C('KAIdxIota.I.step'),[C('KAIdxIota.i0')]);
record('index-only-step',Apps(C('KAIdxIota.I.rec',[L1]),[iMotive,iMinor0,iMinorStep,j1,iMajor]));

const ix0=Apps(C('KAIdxIota.IX'),[Alpha,j0]);
const ixMotive=Lam(J,Lam(Apps(C('KAIdxIota.IX'),[Alpha,B(0)]),N));
const ixMinor=Lam(ix0,Lam(N,B(0)));
const ixMajor=Apps(C('KAIdxIota.IX.step'),[Alpha,C('KAIdxIota.xIX')]);
record('param-index-step',Apps(C('KAIdxIota.IX.rec',[L1]),[Alpha,ixMotive,ixMinor,j1,ixMajor]));

const diMotive=Lam(J,Lam(App(F,B(0)),Lam(Apps(C('KAIdxIota.DI'),[Alpha,B(1),B(0)]),N)));
const diMinor=Lam(J,Lam(App(F,B(0)),Lam(Apps(C('KAIdxIota.DI'),[Alpha,B(1),B(0)]),Lam(N,B(0)))));
const diMajor=Apps(C('KAIdxIota.DI.mk'),[Alpha,j0,C('KAIdxIota.x0'),C('KAIdxIota.d0')]);
record('dependent-index-mk',Apps(C('KAIdxIota.DI.rec',[L1]),[Alpha,diMotive,diMinor,j0,C('KAIdxIota.x0'),diMajor]));

const hoFieldTy=Pi(N,Apps(C('KAIdxIota.HOIX'),[Alpha,j0]));
const hoMotive=Lam(J,Lam(Apps(C('KAIdxIota.HOIX'),[Alpha,B(0)]),N));
const hoIHType=Pi(N,N);
const hoMinor=Lam(hoFieldTy,Lam(hoIHType,App(B(0),n0)));
const hoMajor=Apps(C('KAIdxIota.HOIX.mk'),[Alpha,C('KAIdxIota.fHO')]);
record('higher-order-index-mk',Apps(C('KAIdxIota.HOIX.rec',[L1]),[Alpha,hoMotive,hoMinor,j1,hoMajor]));

const mix0=Apps(C('KAIdxIota.MIX'),[Alpha,j0,k0]),mix1=Apps(C('KAIdxIota.MIX'),[Alpha,j0,k1]);
const mixMotive=Lam(J,Lam(K,Lam(Apps(C('KAIdxIota.MIX'),[Alpha,B(1),B(0)]),N)));
const mixMinor=Lam(mix0,Lam(mix1,Lam(N,Lam(N,B(0)))));
const mixMajor=Apps(C('KAIdxIota.MIX.step'),[Alpha,C('KAIdxIota.m0'),C('KAIdxIota.m1')]);
record('multi-index-step',Apps(C('KAIdxIota.MIX.rec',[L1]),[Alpha,mixMotive,mixMinor,j1,k1,mixMajor]));

const a0=C('KAIdxIota.a0');
const eqMajor=Apps(C('KAIdxIota.EqX.refl',[L1]),[Alpha,a0]);
const eqFamily=b=>Apps(C('KAIdxIota.EqX',[L1]),[Alpha,a0,b]);
const eqMotive=Lam(Alpha,Lam(eqFamily(B(0)),N));
record('eq-like-refl',Apps(C('KAIdxIota.EqX.rec',[L1,L1]),[Alpha,a0,eqMotive,n0,a0,eqMajor]));

const lean=process.env.PROOFSCRIPT_LEAN_BIN;if(!lean)throw new Error('PROOFSCRIPT_LEAN_BIN is required');
const fixture=new URL('../assurance/lean4331/evidence/InductiveIndexedIotaNativeDifferential.lean',import.meta.url).pathname;
const r=spawnSync(lean,[fixture],{encoding:'utf8',maxBuffer:64*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanLines=r.stdout.split(/\r?\n/).filter(l=>l.startsWith('IOTA|'));
if(JSON.stringify(leanLines)!==JSON.stringify(lines)){
 console.error('--- LEAN ---\n'+leanLines.join('\n'));console.error('--- TS ---\n'+lines.join('\n'));
}
assert.deepEqual(leanLines,lines,'indexed iota WHNF differs from exact Lean 4.33.1');
assert.match(r.stdout,/INDUCTIVE_INDEXED_IOTA_NATIVE_CASES=6 FAILURES=0 KERNEL_CHECKS=6/);
console.log('INDUCTIVE_INDEXED_IOTA_CASES=6 MISMATCHES=0 KERNEL_CHECKS=6');
console.log('PASS KERNEL-inductive-indexed-iota-differential exact Lean 4.33.1');
