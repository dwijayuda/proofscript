import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, kernelWhnf, sameTerm, pretty,
  levelOfNat, levelParam,
} from '../packages/kernel/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcFiles = [
  'packages/kernel/src/PSKernel/Environment.ts',
  'packages/kernel/src/PSKernel/Environment/Basic.ts',
  'packages/kernel/src/PSKernel/Declaration.ts',
  'packages/kernel/src/PSKernel/TypeChecker.ts',
  'packages/kernel/src/PSKernel/Expr.ts',
].map(p => path.join(root, p));
const srcByPath = new Map(srcFiles.map(p => [p, fs.readFileSync(p, 'utf8')]));
const src = [...srcByPath.values()].join('\n');

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function extractFunction(name) {
  const direct = src.indexOf(`function ${name}`);
  const exported = src.indexOf(`export function ${name}`);
  const start = direct >= 0 ? direct : exported;
  assert.ok(start >= 0, `missing function ${name}`);
  const markers = ['\nfunction ', '\nexport function '];
  let end = src.length;
  for (const marker of markers) {
    const idx = src.indexOf(marker, start + 1);
    if (idx >= 0 && idx < end) end = idx;
  }
  return src.slice(start, end);
}
function norm(s) { return s.replace(/\s+/g, ''); }
function requireNeedle(body, needle, label) {
  assert.ok(norm(body).includes(norm(needle)), `${label}: missing source obligation ${needle}`);
}

const sourceObligations = [
  ['validateConstructorTargets', [
    'function validateConstructorTargets', 'const head = getAppFn(codomain)', 'codomain must target an inductive family', 'families.has(head.name)',
  ]],
  ['validateConstructorTargetArgumentCount', [
    'function validateConstructorTargetArgumentCount', 'getAppArgs(codomain)', 'codomain applies', 'expected ${expected}',
  ]],
  ['validateConstructorTargetUniverseArgs', [
    'function validateConstructorTargetUniverseArgs', 'levelDefEqList(head.levels, expectedLevels)', 'codomain uses ${head.name} at non-uniform universe levels', 'levelParams',
  ]],
  ['validateConstructorTargetUniformParameters', [
    'function validateConstructorTargetUniformParameters', 'const args = getAppArgs(codomain)', 'numParams', 'codomain parameter', 'uniform family parameter binder',
  ]],
  ['validateConstructorPositivity', [
    'function validateConstructorPositivity', 'constructorDomains(ctor.type)', 'validatePositiveFamilyOccurrence', 'constructor ${ctor.name} field ${i}',
  ]],
  ['validateConstructorDependencies', [
    'function validateConstructorDependencies', 'if (!env.has(dep))', 'references unknown constant',
  ]],
  ['makeInductivePreEnvironment', [
    'function makeInductivePreEnvironment', 'const preEnv = env.fork()', 'duplicate inductive family name', 'addCoreDeclaration',
  ]],
  ['validateConstructorTypesInferToSort', [
    'function validateConstructorTypesInferToSort', 'ensureSort(preEnv', 'infer(preEnv', 'type is not a valid type',
  ]],
  ['validateConstructorFieldUniverses', [
    'function validateConstructorFieldUniverses', 'levelGeq(familyLevel, fieldSort.level)', 'invalid universe level of type_of field', 'levelDefEq(familyLevel, LevelZero)',
  ]],
  ['checkConstantVal', [
    'function checkConstantVal', 'validateDeclaredLevelParams', 'validateNoMVarFVar', 'ensureSort(env, [], typeType)',
  ]],
  ['checkDefinitionBody', [
    'function checkDefinitionBody', 'checkConstantVal', 'validateNoMVarFVar', 'check(env',
  ]],
  ['addTheorem', [
    'function addTheorem', 'checkDefinitionBody', 'type must be a proposition', 'collectDependencyAssumptions', 'addCoreDeclaration',
  ]],
  ['addInductiveOrMutual', [
    'function addInductiveOrMutual', 'validateConstructorTargets', 'validateConstructorTargetArgumentCount', 'validateConstructorTargetUniverseArgs', 'validateConstructorTargetUniformParameters', 'validateConstructorPositivity', 'validateConstructorDependencies', 'validateConstructorTypesInferToSort',
  ]],
  ['checkAndAddDeclaration', [
    'function checkAndAddDeclaration', 'validateCoreDeclarationShape', 'case "inductive"', 'case "mutualInductive"', 'return addInductiveOrMutual',
  ]],
];

let obligationCount = 0;
const sourceHashes = {};
for (const [fn, needles] of sourceObligations) {
  const body = extractFunction(fn);
  sourceHashes[fn] = sha256(body);
  for (const n of needles) { requireNeedle(body, n, fn); obligationCount++; }
}

const L0=levelOfNat(0), L1=levelOfNat(1), L2=levelOfNat(2), L3=levelOfNat(3), u=levelParam('u');
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Let=(type,value,body,nondep=false)=>({tag:'let',type,value,body,nondep});
const baseOpts={recursorProfile:'lean4331', allowEmptyInductives:true, allowProjections:true, allowStructureEta:true, allowHigherOrderPositiveRecursion:true, allowIndexedRecursiveRecursors:true, allowIndexedProjections:true, allowPropElimination:true, allowRecursorK:true, allowInductiveUniverseChecks:true, allowDependentConstructorFields:true, allowTelescopeTerms:true, allowLeanRecursorMinorOrder:true, allowUniformParameterDefEq:true, allowRecursorFamilyBinderInfo:true, allowConversionFinalAudit:true, allowResourceBounds:true, allowProjectionConformance:true};
function base(extra={}){const env=new Environment({...baseOpts,...extra});for(const d of [
  {kind:'axiom',name:'Impl.N',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'Impl.n0',levelParams:[],type:C('Impl.N')},
  {kind:'axiom',name:'Impl.J',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'Impl.j0',levelParams:[],type:C('Impl.J')},
  {kind:'axiom',name:'Impl.j1',levelParams:[],type:C('Impl.J')},
  {kind:'axiom',name:'Impl.A',levelParams:[],type:S(L1)},
]) checkAndAddDeclaration(env,d);return env;}
function names(env){return env.all().map(x=>x.declaration.name).sort();}
function rec(env,name){const e=env.get(`${name}.rec`);assert.ok(e,`${name}.rec missing`);assert.equal(e.declaration.kind,'recursor');return e.declaration.metadata;}
function accept(decl,extra){const env=base(extra);const before=names(env);const checked=checkAndAddDeclaration(env,decl);assert.equal(checked.declaration.name,decl.name);assert.ok(env.has(decl.name));assert.notDeepEqual(names(env),before);return {env,checked,md:rec(env,decl.name)};}
function reject(decl,needle,extra){const env=base(extra);const before=names(env);let msg='';try{checkAndAddDeclaration(env,decl);}catch(e){msg=String(e?.message??e);}assert.match(msg,needle,`${decl.name} wrong/no rejection: ${msg}`);assert.deepEqual(names(env),before,`${decl.name} rejection mutated environment`);return msg;}
function assertWhnfEq(env,label,a,b){const wa=kernelWhnf(env,a),wb=kernelWhnf(env,b);assert.ok(sameTerm(wa,wb),`${label}\nactual ${pretty(wa)}\nexpected ${pretty(wb)}`);}

const letParam=Let(S(L1),B(0),B(0));
const R={kind:'inductive',name:'Impl.R',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Impl.R.mk',type:Pi(S(L1),Pi(App(C('Impl.R'),letParam),App(C('Impl.R'),B(1))))}
]};
const I={kind:'inductive',name:'Impl.I',levelParams:[],type:Pi(S(L1),Pi(C('Impl.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'Impl.I.zero',type:Pi(S(L1),Apps(C('Impl.I'),[B(0),C('Impl.j0')]))},
  {name:'Impl.I.step',type:Pi(S(L1),Pi(Apps(C('Impl.I'),[letParam,C('Impl.j0')]),Apps(C('Impl.I'),[B(1),C('Impl.j1')])))},
]};
const HO={kind:'inductive',name:'Impl.HO',levelParams:[],type:Pi(S(L1),Pi(C('Impl.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'Impl.HO.mk',type:Pi(S(L1),Pi(Pi(C('Impl.N'),Apps(C('Impl.HO'),[Let(S(L1),B(1),B(0)),C('Impl.j0')])),Apps(C('Impl.HO'),[B(1),C('Impl.j1')])))},
]};
const EqLike={kind:'inductive',name:'Impl.EqLike',levelParams:['u'],type:Pi(S(u),Pi(B(0),Pi(B(1),S(L0)))),numParams:2,numIndices:1,constructors:[
  {name:'Impl.EqLike.refl',type:Pi(S(u),Pi(B(0),Apps(C('Impl.EqLike',[u]),[B(1),B(0),B(0)])))}
]};
const PropHuge={kind:'inductive',name:'Impl.PropHuge',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
  {name:'Impl.PropHuge.mk',type:Pi(S(L2),C('Impl.PropHuge'))}
]};
const NegativeDomain={kind:'inductive',name:'Impl.NegDom',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Impl.NegDom.mk',type:Pi(S(L1),Pi(Pi(App(C('Impl.NegDom'),B(0)),C('Impl.N')),App(C('Impl.NegDom'),B(1))))}
]};
const BadIndexRec={kind:'inductive',name:'Impl.BadIndexRec',levelParams:[],type:Pi(S(L1),Pi(S(L2),S(L3))),numParams:1,numIndices:1,constructors:[
  {name:'Impl.BadIndexRec.mk',type:Pi(S(L1),Pi(S(L2),Pi(Apps(C('Impl.BadIndexRec'),[B(1),Apps(C('Impl.BadIndexRec'),[B(1),B(0)])]),Apps(C('Impl.BadIndexRec'),[B(2),B(1)]))))}
]};
const BadResultParam={kind:'inductive',name:'Impl.BadResultParam',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Impl.BadResultParam.mk',type:Pi(S(L1),App(C('Impl.BadResultParam'),C('Impl.N')))}
]};
const BadFieldUniverse={kind:'inductive',name:'Impl.BadFieldUniverse',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'Impl.BadFieldUniverse.mk',type:Pi(S(L1),C('Impl.BadFieldUniverse'))}
]};

let accepted=0,rejected=0,atomic=0,optionSentinels=0;
{
  const {env,md}=accept(R); accepted++; assert.deepEqual(md.rules[0].recursiveFields,[true]); assert.equal(md.numParams,1); assert.equal(md.numIndices,0);
  const ty=App(C('Impl.R'),C('Impl.A')); checkAndAddDeclaration(env,{kind:'axiom',name:'Impl.rx',levelParams:[],type:ty});
  const motive=Lam(ty,C('Impl.N')), minor=Lam(ty,Lam(C('Impl.N'),B(0)));
  assertWhnfEq(env,'defEq-normalized recursive parameter in actual non-mutual classifier',Apps(C('Impl.R.rec',[L1]),[C('Impl.A'),motive,minor,Apps(C('Impl.R.mk'),[C('Impl.A'),C('Impl.rx')])]),Apps(C('Impl.R.rec',[L1]),[C('Impl.A'),motive,minor,C('Impl.rx')]));
}
{
  const {env,md}=accept(I); accepted++; assert.deepEqual(md.rules.map(r=>r.recursiveFields),[[],[true]]);
  const i0=Apps(C('Impl.I'),[C('Impl.A'),C('Impl.j0')]); checkAndAddDeclaration(env,{kind:'axiom',name:'Impl.ix',levelParams:[],type:i0});
  const motive=Lam(C('Impl.J'),Lam(Apps(C('Impl.I'),[C('Impl.A'),B(0)]),C('Impl.N')));
  assertWhnfEq(env,'indexed recursive parameter normalized by actual classifier',Apps(C('Impl.I.rec',[L1]),[C('Impl.A'),motive,C('Impl.n0'),Lam(i0,Lam(C('Impl.N'),B(0))),C('Impl.j1'),Apps(C('Impl.I.step'),[C('Impl.A'),C('Impl.ix')])]),Apps(C('Impl.I.rec',[L1]),[C('Impl.A'),motive,C('Impl.n0'),Lam(i0,Lam(C('Impl.N'),B(0))),C('Impl.j0'),C('Impl.ix')]));
}
{
  const {env,md}=accept(HO); accepted++; assert.deepEqual(md.rules[0].recursiveFields,[true]); assert.ok(md.rules[0].recursiveFieldTypes[0]);
  const fTy=Pi(C('Impl.N'),Apps(C('Impl.HO'),[C('Impl.A'),C('Impl.j0')])); checkAndAddDeclaration(env,{kind:'axiom',name:'Impl.f',levelParams:[],type:fTy});
  const motive=Lam(C('Impl.J'),Lam(Apps(C('Impl.HO'),[C('Impl.A'),B(0)]),C('Impl.N')));
  const minor=Lam(fTy,Lam(Pi(C('Impl.N'),C('Impl.N')),App(B(0),C('Impl.n0'))));
  assertWhnfEq(env,'higher-order indexed pointwise IH from actual classifier metadata',Apps(C('Impl.HO.rec',[L1]),[C('Impl.A'),motive,minor,C('Impl.j1'),Apps(C('Impl.HO.mk'),[C('Impl.A'),C('Impl.f')])]),Apps(C('Impl.HO.rec',[L1]),[C('Impl.A'),motive,minor,C('Impl.j0'),App(C('Impl.f'),C('Impl.n0'))]));
}
{ const {md}=accept(EqLike); accepted++; assert.equal(md.numParams,2); assert.equal(md.numIndices,1); assert.deepEqual(md.rules[0].recursiveFields,[]); }
{ const {env}=accept(PropHuge); accepted++; assert.ok(env.has('Impl.PropHuge.mk')); }
for (const [d,re] of [[NegativeDomain,/non-positive occurrence|non-direct or negative|negative recursive occurrence/],[BadIndexRec,/inside an index|inductive target argument|type mismatch|universe level/],[BadResultParam,/codomain parameter 0 is not (the corresponding uniform parameter|the uniform family parameter binder)/],[BadFieldUniverse,/universe level of type_of/]]) { reject(d,re); rejected++; atomic++; }

reject(R,/non-uniform recursive parameter 0/,{allowUniformParameterDefEq:false}); optionSentinels++;
reject(HO,/non-direct or negative|unsupported/,{allowHigherOrderPositiveRecursion:false}); optionSentinels++;
reject(I,/indexed recursive recursors are unsupported/,{allowIndexedRecursiveRecursors:false}); optionSentinels++;
{ const {env}=accept(BadFieldUniverse,{allowInductiveUniverseChecks:false}); assert.ok(env.has('Impl.BadFieldUniverse.mk')); optionSentinels++; }

const bridge = spawnSync(process.execPath,[path.join(root,'tools/kernel-inductive-nonmutual-classifier-correspondence-tests.ts')],{cwd:root,encoding:'utf8',env:{...process.env,PROOFSCRIPT_LEAN_BIN:process.env.PROOFSCRIPT_LEAN_BIN??''},timeout:180_000,maxBuffer:32*1024*1024});
const bridgeOut = `${bridge.stdout??''}\n${bridge.stderr??''}`;
if (process.env.PROOFSCRIPT_LEAN_BIN) {
  assert.equal(bridge.status,0,bridgeOut);
  assert.match(bridgeOut,/NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0/);
}

console.log(`TS_CLASSIFIER_SOURCE_FUNCTIONS=${sourceObligations.length}`);
console.log(`TS_CLASSIFIER_SOURCE_OBLIGATIONS=${obligationCount} MISSING=0`);
console.log(`TS_CLASSIFIER_SOURCE_HASHES=${JSON.stringify(sourceHashes)}`);
console.log(`TS_CLASSIFIER_RUNTIME_ACCEPTED=${accepted} REJECTED=${rejected} ATOMIC=${atomic}`);
console.log(`TS_CLASSIFIER_OPTION_SENTINELS=${optionSentinels} PASS`);
console.log('TS_CLASSIFIER_EXISTING_EXACT_BRIDGE=' + (process.env.PROOFSCRIPT_LEAN_BIN ? 'PASS' : 'SKIPPED_NO_LEAN'));
console.log('TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0');
console.log('PASS KERNEL-inductive-nonmutual-ts-implementation-correspondence v71');
