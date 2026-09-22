import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, levelOfNat, levelParam,
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1), u=levelParam('u');
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});

const opts={
  recursorProfile:'lean4331', allowEmptyInductives:true, allowProjections:true,
  allowStructureEta:true, allowHigherOrderPositiveRecursion:true,
  allowIndexedRecursiveRecursors:true, allowIndexedProjections:true,
  allowPropElimination:true, allowRecursorK:true, allowInductiveUniverseChecks:true,
  allowDependentConstructorFields:true, allowTelescopeTerms:true,
  allowMutualInductives:true, allowMutualParameters:true, allowMutualIndices:true,
  allowHigherOrderMutualRecursion:true, allowMutualProp:true,
  allowNestedInductives:true, allowNestedParameters:true, allowNestedIndices:true,
  allowNestedIndexExpressions:true, allowNestedMultipleSpecializations:true,
  allowNestedPolymorphic:true, allowNestedIndexedContainers:true,
  allowLeanRecursorMinorOrder:true, allowNestedDeeper:true,
  allowNestedDeeperGeneralization:true, allowNestedDeeperParameters:true,
  allowNestedDeeperIndices:true, allowNestedDeeperPolymorphic:true,
  allowNestedDeeperMultipleFields:true, allowNestedDeeperProp:true,
  allowNestedDeeperMultiParameter:true, allowNestedDeeperMultiParameterGeneralization:true,
  allowNestedDeeperDependentContainerParameters:true, allowUniformParameterDefEq:true,
  allowRecursorFamilyBinderInfo:true, allowMutualNestedGeneralization:true,
  allowMutualNestedParameters:true, allowMutualNestedIndices:true,
  allowMutualNestedPolymorphic:true, allowMutualNestedProp:true,
  allowMutualNestedIndexedContainers:true, allowMutualNestedDeeper:true,
  allowMutualNestedDeeperParameters:true, allowMutualNestedDeeperIndices:true,
  allowMutualNestedDeeperPolymorphic:true, allowMutualNestedDeeperProp:true,
  allowMutualNestedDeeperIndexedContainers:true,
  allowMutualNestedDeeperMultiParameterContainers:true,
  allowMutualNestedDeeperDependentContainerParameters:true,
  allowMutualNestedDeeperMultipleFields:true,
  allowMutualNestedDeeperMultipleRecursiveParameterSlots:true,
  allowMutualNestedFinalGeneralizationAudit:true, allowConversionFinalAudit:true,
  allowResourceBounds:true, allowProjectionConformance:true,
};

function levelS(l){switch(l.tag){case'zero':return'0';case'succ':return`(s ${levelS(l.of)})`;case'max':return`(max ${levelS(l.left)} ${levelS(l.right)})`;case'imax':return`(imax ${levelS(l.left)} ${levelS(l.right)})`;case'param':return`(p ${l.name})`;}}
function binderS(b){return b==='explicit'?'E':b==='implicit'?'I':b==='strictImplicit'?'S':'Inst';}
function exprS(e){switch(e.tag){case'bvar':return`(b ${e.index})`;case'sort':return`(sort ${levelS(e.level)})`;case'const':return`(c ${e.name} [${e.levels.map(levelS).join(',')}])`;case'app':return`(a ${exprS(e.fn)} ${exprS(e.arg)})`;case'lam':return`(lam ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'pi':return`(pi ${binderS(e.binderInfo??'explicit')} ${exprS(e.domain)} ${exprS(e.body)})`;case'let':return`(let ${e.nondep} ${exprS(e.type)} ${exprS(e.value)} ${exprS(e.body)})`;case'proj':return`(proj ${e.typeName} ${e.index} ${exprS(e.expr)})`;}}
function splitPi(t){const fields=[];let cur=t;while(cur.tag==='pi'){fields.push(cur.domain);cur=cur.body;}return fields;}
function familyRecursive(rec){return rec.metadata.rules.some(r=>(r.recursiveFields??[]).some(Boolean));}
function familyK(decl,rec){const m=rec.metadata;if(m.mutual||decl.constructors.length!==1||m.rules.length!==1)return false;let t=decl.type;while(t.tag==='pi')t=t.body;if(!(t.tag==='sort'&&t.level.tag==='zero'))return false;const fields=splitPi(decl.constructors[0].type).length-decl.numParams;return fields===0&&m.rules[0].ctor===decl.constructors[0].name;}
function base(){
  const env=new Environment(opts);
  for(const d of [
    {kind:'axiom',name:'KAIdx.J',levelParams:[],type:S(L1)},
    {kind:'axiom',name:'KAIdx.j0',levelParams:[],type:C('KAIdx.J')},
    {kind:'axiom',name:'KAIdx.j1',levelParams:[],type:C('KAIdx.J')},
    {kind:'axiom',name:'KAIdx.K',levelParams:[],type:S(L1)},
    {kind:'axiom',name:'KAIdx.k0',levelParams:[],type:C('KAIdx.K')},
    {kind:'axiom',name:'KAIdx.k1',levelParams:[],type:C('KAIdx.K')},
    {kind:'axiom',name:'KAIdx.F',levelParams:[],type:Pi(C('KAIdx.J'),S(L1))},
    {kind:'axiom',name:'KAIdx.N',levelParams:[],type:S(L1)},
    {kind:'axiom',name:'KAIdx.Alpha',levelParams:[],type:S(L1)},
  ]) checkAndAddDeclaration(env,d);
  return env;
}

const I={kind:'inductive',name:'KAIdx.I',levelParams:[],type:Pi(C('KAIdx.J'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'KAIdx.I.at0',type:Apps(C('KAIdx.I'),[C('KAIdx.j0')])},
  {name:'KAIdx.I.step',type:Pi(Apps(C('KAIdx.I'),[C('KAIdx.j0')]),Apps(C('KAIdx.I'),[C('KAIdx.j1')]))},
]};
const IX={kind:'inductive',name:'KAIdx.IX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.IX.step',type:Pi(S(L1),Pi(Apps(C('KAIdx.IX'),[B(0),C('KAIdx.j0')]),Apps(C('KAIdx.IX'),[B(1),C('KAIdx.j1')])))},
]};
const DI={kind:'inductive',name:'KAIdx.DI',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),Pi(App(C('KAIdx.F'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'KAIdx.DI.mk',type:Pi(S(L1),Pi(C('KAIdx.J'),Pi(App(C('KAIdx.F'),B(0)),Pi(Apps(C('KAIdx.DI'),[B(2),B(1),B(0)]),Apps(C('KAIdx.DI'),[B(3),B(2),B(1)])))))}
]};
const HOIX={kind:'inductive',name:'KAIdx.HOIX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.HOIX.mk',type:Pi(S(L1),Pi(Pi(C('KAIdx.N'),Apps(C('KAIdx.HOIX'),[B(1),C('KAIdx.j0')])),Apps(C('KAIdx.HOIX'),[B(1),C('KAIdx.j1')])))},
]};
const MIX={kind:'inductive',name:'KAIdx.MIX',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),Pi(C('KAIdx.K'),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'KAIdx.MIX.step',type:Pi(S(L1),Pi(Apps(C('KAIdx.MIX'),[B(0),C('KAIdx.j0'),C('KAIdx.k0')]),Pi(Apps(C('KAIdx.MIX'),[B(1),C('KAIdx.j0'),C('KAIdx.k1')]),Apps(C('KAIdx.MIX'),[B(2),C('KAIdx.j1'),C('KAIdx.k1')]))))},
]};
const EqX={kind:'inductive',name:'KAIdx.EqX',levelParams:['u'],type:Pi(S(u),Pi(B(0),Pi(B(1),S(L0)))),numParams:2,numIndices:1,constructors:[
  {name:'KAIdx.EqX.refl',type:Pi(S(u),Pi(B(0),Apps(C('KAIdx.EqX',[u]),[B(1),B(0),B(0)])))}
]};
const positive=[['index-only',I],['param-index',IX],['dependent-index',DI],['higher-order-index',HOIX],['multi-index',MIX],['eq-like',EqX]];

const BadTel={kind:'inductive',name:'KAIdx.BadTel',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadTel.mk',type:Pi(C('KAIdx.J'),Apps(C('KAIdx.BadTel'),[B(0),C('KAIdx.j0')]))}
]};
const BadResultParam={kind:'inductive',name:'KAIdx.BadResultParam',levelParams:[],type:Pi(C('KAIdx.J'),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadResultParam.mk',type:Pi(C('KAIdx.J'),Pi(C('KAIdx.J'),Apps(C('KAIdx.BadResultParam'),[B(0),C('KAIdx.j0')])))},
]};
const BadRecParam={kind:'inductive',name:'KAIdx.BadRecParam',levelParams:[],type:Pi(C('KAIdx.J'),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadRecParam.mk',type:Pi(C('KAIdx.J'),Pi(C('KAIdx.J'),Pi(Apps(C('KAIdx.BadRecParam'),[B(0),C('KAIdx.j0')]),Apps(C('KAIdx.BadRecParam'),[B(2),C('KAIdx.j1')]))))},
]};
const BadArity={kind:'inductive',name:'KAIdx.BadArity',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadArity.mk',type:Pi(S(L1),App(C('KAIdx.BadArity'),B(0)))},
]};
const BadIndexType={kind:'inductive',name:'KAIdx.BadIndexType',levelParams:[],type:Pi(S(L1),Pi(C('KAIdx.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadIndexType.mk',type:Pi(S(L1),Apps(C('KAIdx.BadIndexType'),[B(0),C('KAIdx.Alpha')]))},
]};
const BadLevel={kind:'inductive',name:'KAIdx.BadLevel',levelParams:['u'],type:Pi(S(u),Pi(C('KAIdx.J'),S({tag:'succ',of:u}))),numParams:1,numIndices:1,constructors:[
  {name:'KAIdx.BadLevel.mk',type:Pi(S(u),Apps(C('KAIdx.BadLevel',[L0]),[B(0),C('KAIdx.j0')]))},
]};
const negative=[['parameter-telescope',BadTel],['result-parameter',BadResultParam],['recursive-parameter',BadRecParam],['result-arity',BadArity],['index-type',BadIndexType],['universe-instance',BadLevel]];

const tsLines=[];
for(const [id,d] of positive){
  const env=base(); const checked=checkAndAddDeclaration(env,d); assert.equal(checked.declaration.kind,'inductive');
  tsLines.push(`ADM|${id}|ACCEPT|atomic=1`);
  const rec=env.get(`${d.name}.rec`); assert(rec&&rec.declaration.kind==='recursor',`${id}: recursor missing`);
  const md=rec.declaration.metadata;
  tsLines.push(`IND|${id}|${d.name}|lp=${d.levelParams.join(',')}|ty=${exprS(d.type)}|np=${d.numParams}|ni=${d.numIndices}|all=${d.name}|ctors=${d.constructors.map(c=>c.name).join(',')}|nested=0|rec=${familyRecursive(rec.declaration)?1:0}|unsafe=0`);
  d.constructors.forEach((c,cidx)=>{
    const ce=env.get(c.name); assert(ce&&ce.declaration.kind==='constructor');
    const nf=splitPi(c.type).length-d.numParams;
    tsLines.push(`CTOR|${id}|${c.name}|lp=${d.levelParams.join(',')}|ty=${exprS(c.type)}|ind=${d.name}|cidx=${cidx}|np=${d.numParams}|nf=${nf}|unsafe=0`);
  });
  const k=familyK(d,rec.declaration);
  tsLines.push(`REC|${id}|${rec.declaration.name}|lp=${rec.declaration.levelParams.join(',')}|ty=${exprS(rec.declaration.type)}|all=${d.name}|np=${md.numParams}|ni=${md.numIndices}|nm=${md.mutual?.motiveCount??1}|nmin=${md.numMinors}|k=${k?1:0}|unsafe=0|rules=${md.rules.map(r=>`${r.ctor}:${r.nfields}`).join(',')}`);
}
for(const [id,d] of negative){
  const env=base(); let rejected=false; try{checkAndAddDeclaration(env,d);}catch{rejected=true;}
  assert.equal(rejected,true,`${id} unexpectedly accepted`);
  const leaked=env.has(d.name)||env.has(`${d.name}.rec`)||d.constructors.some(c=>env.has(c.name));
  assert.equal(leaked,false,`${id} rejection leaked declarations`);
  tsLines.push(`ADM|${id}|REJECT|atomic=1`);
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(!lean){
  console.log(`INDUCTIVE_INDEXED_TS_POSITIVE=${positive.length} NEGATIVE=${negative.length} FAILURES=0 ATOMIC_FAILURES=${negative.length}`);
  process.exit(0);
}
const fixture=new URL('../assurance/lean4331/evidence/InductiveIndexedAdmissionNativeDifferential.lean',import.meta.url).pathname;
const r=spawnSync(lean,['--run',fixture],{encoding:'utf8',maxBuffer:64*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanLines=r.stdout.split(/\r?\n/).filter(l=>/^(ADM|IND|CTOR|REC)\|/.test(l));
function alphaNormalizeRecLine(line){
  if(!line.startsWith('REC|')) return line;
  const m=line.match(/^(REC\|[^|]+\|[^|]+\|lp=)([^|]*)(\|ty=)(.*)$/);
  if(!m) return line;
  const params=m[2]?m[2].split(','):[]; let rest=m[4];
  params.forEach((name,i)=>{
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    rest=rest.replace(new RegExp(`\\(p ${escaped}\\)`,'g'),`(p u${i})`);
  });
  return `${m[1]}${params.map((_,i)=>`u${i}`).join(',')}${m[3]}${rest}`;
}
const leanNorm=leanLines.map(alphaNormalizeRecLine), tsNorm=tsLines.map(alphaNormalizeRecLine);
if(JSON.stringify(leanNorm)!==JSON.stringify(tsNorm)){
  console.error('--- LEAN ---'); console.error(leanNorm.join('\n'));
  console.error('--- TS ---'); console.error(tsNorm.join('\n'));
}
assert.deepEqual(leanNorm,tsNorm,'indexed inductive admission/generated metadata differs from exact Lean 4.33.1 modulo recursor universe alpha-renaming');
assert.match(r.stdout,/INDUCTIVE_INDEXED_NATIVE_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6/);
console.log(`INDUCTIVE_INDEXED_STRUCTURAL_LINES=${tsLines.filter(l=>!l.startsWith('ADM|')).length} MISMATCHES=0`);
console.log('INDUCTIVE_INDEXED_POSITIVE=6 NEGATIVE=6 FAILURES=0 ATOMIC_FAILURES=6');
console.log('PASS KERNEL-inductive-indexed-admission-differential exact Lean 4.33.1');
