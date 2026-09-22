import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, levelOfNat, levelParam,
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1), u=levelParam('u');
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
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
function base(){const env=new Environment(opts);checkAndAddDeclaration(env,{kind:'axiom',name:'KAInd.N',levelParams:[],type:S(L1)});return env;}

const positive=[
  ['unit',{kind:'inductive',name:'KAInd.Unitish',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.Unitish.mk',type:C('KAInd.Unitish')}]}],
  ['list',{kind:'inductive',name:'KAInd.Listish',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.Listish.nil',type:C('KAInd.Listish')},{name:'KAInd.Listish.cons',type:Pi(C('KAInd.N'),Pi(C('KAInd.Listish'),C('KAInd.Listish')))}]}],
  ['ho',{kind:'inductive',name:'KAInd.HO',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.HO.mk',type:Pi(Pi(C('KAInd.N'),C('KAInd.HO')),C('KAInd.HO'))}]}],
  ['void',{kind:'inductive',name:'KAInd.Voidish',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[]}],
  ['prop',{kind:'inductive',name:'KAInd.Propish',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'KAInd.Propish.mk',type:Pi(C('KAInd.N'),C('KAInd.Propish'))}]}],
  ['poly',{kind:'inductive',name:'KAInd.Poly',levelParams:['u'],type:S({tag:'succ',of:u}),numParams:0,numIndices:0,constructors:[{name:'KAInd.Poly.mk',type:C('KAInd.Poly',[u])}]}],
];
const negative=[
  ['negative-position',{kind:'inductive',name:'KAInd.Neg',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.Neg.mk',type:Pi(Pi(C('KAInd.Neg'),C('KAInd.N')),C('KAInd.Neg'))}]}],
  ['bad-result',{kind:'inductive',name:'KAInd.BadResult',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.BadResult.mk',type:C('KAInd.N')}]}],
  ['field-universe',{kind:'inductive',name:'KAInd.BigField',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.BigField.mk',type:Pi(S(L1),C('KAInd.BigField'))}]}],
  ['duplicate-constructor',{kind:'inductive',name:'KAInd.DupCtor',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'KAInd.DupCtor.mk',type:C('KAInd.DupCtor')},{name:'KAInd.DupCtor.mk',type:C('KAInd.DupCtor')}]}],
];

const tsLines=[];
for(const [id,d] of positive){
  const env=base();const checked=checkAndAddDeclaration(env,d);assert.equal(checked.declaration.kind,'inductive');
  tsLines.push(`ADM|${id}|ACCEPT|atomic=1`);
  const rec=env.get(`${d.name}.rec`);assert(rec&&rec.declaration.kind==='recursor');
  const md=rec.declaration.metadata;
  tsLines.push(`IND|${id}|${d.name}|lp=${d.levelParams.join(',')}|ty=${exprS(d.type)}|np=${d.numParams}|ni=${d.numIndices}|all=${d.name}|ctors=${d.constructors.map(c=>c.name).join(',')}|nested=0|rec=${familyRecursive(rec.declaration)?1:0}|unsafe=0`);
  d.constructors.forEach((c,cidx)=>{
    const ce=env.get(c.name);assert(ce&&ce.declaration.kind==='constructor');
    const nf=splitPi(c.type).length-d.numParams;
    tsLines.push(`CTOR|${id}|${c.name}|lp=${d.levelParams.join(',')}|ty=${exprS(c.type)}|ind=${d.name}|cidx=${cidx}|np=${d.numParams}|nf=${nf}|unsafe=0`);
  });
  const k=familyK(d,rec.declaration);
  tsLines.push(`REC|${id}|${rec.declaration.name}|lp=${rec.declaration.levelParams.join(',')}|ty=${exprS(rec.declaration.type)}|all=${d.name}|np=${md.numParams}|ni=${md.numIndices}|nm=${md.mutual?.motiveCount??1}|nmin=${md.numMinors}|k=${k?1:0}|unsafe=0|rules=${md.rules.map(r=>`${r.ctor}:${r.nfields}`).join(',')}`);
}
for(const [id,d] of negative){
  const env=base();let rejected=false;try{checkAndAddDeclaration(env,d);}catch{rejected=true;}
  assert.equal(rejected,true,`${id} unexpectedly accepted`);
  const leaked=env.has(d.name)||env.has(`${d.name}.rec`)||d.constructors.some(c=>env.has(c.name));
  assert.equal(leaked,false,`${id} rejection leaked declarations`);
  tsLines.push(`ADM|${id}|REJECT|atomic=1`);
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;if(!lean)throw new Error('PROOFSCRIPT_LEAN_BIN is required');
const fixture=new URL('../assurance/lean4331/evidence/InductiveDirectAdmissionNativeDifferential.lean',import.meta.url).pathname;
const r=spawnSync(lean,['--run',fixture],{encoding:'utf8',maxBuffer:64*1024*1024});
if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(1);}
const leanLines=r.stdout.split(/\r?\n/).filter(l=>/^(ADM|IND|CTOR|REC)\|/.test(l));
// Generated recursor universe parameter *names* are not semantic: Lean and
// ProofScript both instantiate them positionally. Canonicalize only REC lines
// by declaration-local parameter order before structural comparison.
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
const leanNorm=leanLines.map(alphaNormalizeRecLine);
const tsNorm=tsLines.map(alphaNormalizeRecLine);
assert.deepEqual(leanNorm,tsNorm,'direct inductive admission/generated metadata differs from exact Lean 4.33.1 modulo recursor universe alpha-renaming');
assert.match(r.stdout,/INDUCTIVE_DIRECT_NATIVE_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4/);
console.log(`INDUCTIVE_DIRECT_STRUCTURAL_LINES=${tsLines.filter(l=>!l.startsWith('ADM|')).length} MISMATCHES=0`);
console.log('INDUCTIVE_DIRECT_POSITIVE=6 NEGATIVE=4 FAILURES=0 ATOMIC_FAILURES=4');
console.log('PASS KERNEL-inductive-direct-admission-differential exact Lean 4.33.1');
