import assert from 'node:assert/strict';
import {
  Environment, checkAndAddDeclaration, levelOfNat, levelParam,
  kernelWhnf, infer, pretty, sameTerm,
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1), L2=levelOfNat(2), L3=levelOfNat(3), u=levelParam('u');
const S=level=>({tag:'sort',level});
const C=(name,levels=[])=>({tag:'const',name,levels});
const B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Let=(type,value,body,nondep=false)=>({tag:'let',type,value,body,nondep});

const opts={
  recursorProfile:'lean4331', allowEmptyInductives:true, allowProjections:true,
  allowStructureEta:true, allowHigherOrderPositiveRecursion:true,
  allowIndexedRecursiveRecursors:true, allowIndexedProjections:true,
  allowPropElimination:true, allowRecursorK:true, allowInductiveUniverseChecks:true,
  allowDependentConstructorFields:true, allowTelescopeTerms:true,
  allowMutualInductives:true, allowMutualParameters:true, allowMutualIndices:true,
  allowHigherOrderMutualRecursion:true, allowMutualProp:true, allowNestedInductives:true,
  allowNestedParameters:true, allowNestedIndices:true, allowNestedIndexExpressions:true,
  allowNestedMultipleSpecializations:true, allowNestedPolymorphic:true,
  allowNestedIndexedContainers:true, allowLeanRecursorMinorOrder:true,
  allowNestedDeeper:true, allowNestedDeeperGeneralization:true,
  allowNestedDeeperParameters:true, allowNestedDeeperIndices:true,
  allowNestedDeeperPolymorphic:true, allowNestedDeeperMultipleFields:true,
  allowNestedDeeperProp:true, allowNestedDeeperMultiParameter:true,
  allowNestedDeeperMultiParameterGeneralization:true,
  allowNestedDeeperDependentContainerParameters:true, allowUniformParameterDefEq:true,
  allowRecursorFamilyBinderInfo:true, allowMutualNestedGeneralization:true,
  allowMutualNestedParameters:true, allowMutualNestedIndices:true,
  allowMutualNestedPolymorphic:true, allowMutualNestedProp:true,
  allowMutualNestedIndexedContainers:true, allowResourceBounds:true,
  allowProjectionConformance:true,
};

function base(){
  const env=new Environment(opts);
  for(const d of [
    {kind:'axiom',name:'Cls.N',levelParams:[],type:S(L1)},
    {kind:'axiom',name:'Cls.n0',levelParams:[],type:C('Cls.N')},
    {kind:'axiom',name:'Cls.J',levelParams:[],type:S(L1)},
    {kind:'axiom',name:'Cls.j0',levelParams:[],type:C('Cls.J')},
    {kind:'axiom',name:'Cls.j1',levelParams:[],type:C('Cls.J')},
    {kind:'axiom',name:'Cls.A',levelParams:[],type:S(L1)},
  ]) checkAndAddDeclaration(env,d);
  return env;
}
function splitPi(t){const xs=[];let c=t;while(c.tag==='pi'){xs.push(c.domain);c=c.body;}return xs;}
function rec(env,name){const e=env.get(`${name}.rec`);assert.ok(e,`${name}.rec missing`);assert.equal(e.declaration.kind,'recursor');return e.declaration.metadata;}
function accept(decl){const env=base();const checked=checkAndAddDeclaration(env,decl);assert.equal(checked.declaration.name,decl.name);return {env,checked,md:rec(env,decl.name)};}
function reject(decl,needle){const env=base();let msg='';try{checkAndAddDeclaration(env,decl);}catch(e){msg=String(e?.message??e);}assert.match(msg,needle,`${decl.name} wrong/no rejection: ${msg}`);const leaked=env.has(decl.name)||env.has(`${decl.name}.rec`)||decl.constructors.some(c=>env.has(c.name));assert.equal(leaked,false,`${decl.name} rejection leaked generated declarations`);return msg;}
function assertWhnfEq(env,label,a,b){const wa=kernelWhnf(env,a), wb=kernelWhnf(env,b);assert.ok(sameTerm(wa,wb),`${label}\nactual ${pretty(wa)}\nexpected ${pretty(wb)}`);}

const letParam=Let(S(L1),B(0),B(0));

const R={kind:'inductive',name:'Cls.R',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Cls.R.mk',type:Pi(S(L1),Pi(App(C('Cls.R'),letParam),App(C('Cls.R'),B(1))))}
]};
{
  const {env,md}=accept(R); assert.deepEqual(md.rules[0].recursiveFields,[true]);
  assert.equal(md.rules[0].recursiveFieldTypes.length,1);
  const ty=App(C('Cls.R'),C('Cls.A'));checkAndAddDeclaration(env,{kind:'axiom',name:'Cls.rx',levelParams:[],type:ty});
  const motive=Lam(ty,C('Cls.N')), minor=Lam(ty,Lam(C('Cls.N'),B(0)));
  const app=Apps(C('Cls.R.rec',[L1]),[C('Cls.A'),motive,minor,Apps(C('Cls.R.mk'),[C('Cls.A'),C('Cls.rx')])]);
  const expected=Apps(C('Cls.R.rec',[L1]),[C('Cls.A'),motive,minor,C('Cls.rx')]);
  assertWhnfEq(env,'nonindexed recursive parameter normalized by defEq',app,expected);
}

const I={kind:'inductive',name:'Cls.I',levelParams:[],type:Pi(S(L1),Pi(C('Cls.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'Cls.I.zero',type:Pi(S(L1),Apps(C('Cls.I'),[B(0),C('Cls.j0')]))},
  {name:'Cls.I.step',type:Pi(S(L1),Pi(Apps(C('Cls.I'),[letParam,C('Cls.j0')]),Apps(C('Cls.I'),[B(1),C('Cls.j1')])))},
]};
{
  const {env,md}=accept(I); assert.deepEqual(md.rules.map(r=>r.recursiveFields),[[],[true]]);
  const i0=Apps(C('Cls.I'),[C('Cls.A'),C('Cls.j0')]);checkAndAddDeclaration(env,{kind:'axiom',name:'Cls.ix',levelParams:[],type:i0});
  const motive=Lam(C('Cls.J'),Lam(Apps(C('Cls.I'),[C('Cls.A'),B(0)]),C('Cls.N')));
  const app=Apps(C('Cls.I.rec',[L1]),[C('Cls.A'),motive,C('Cls.n0'),Lam(i0,Lam(C('Cls.N'),B(0))),C('Cls.j1'),Apps(C('Cls.I.step'),[C('Cls.A'),C('Cls.ix')])]);
  const expected=Apps(C('Cls.I.rec',[L1]),[C('Cls.A'),motive,C('Cls.n0'),Lam(i0,Lam(C('Cls.N'),B(0))),C('Cls.j0'),C('Cls.ix')]);
  assertWhnfEq(env,'indexed recursive parameter normalized by defEq',app,expected);
}

const HO={kind:'inductive',name:'Cls.HO',levelParams:[],type:Pi(S(L1),Pi(C('Cls.J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'Cls.HO.mk',type:Pi(S(L1),Pi(Pi(C('Cls.N'),Apps(C('Cls.HO'),[Let(S(L1),B(1),B(0)),C('Cls.j0')])),Apps(C('Cls.HO'),[B(1),C('Cls.j1')])))},
]};
{
  const {env,md}=accept(HO); assert.deepEqual(md.rules[0].recursiveFields,[true]);
  assert.ok(md.rules[0].recursiveFieldTypes[0], 'higher-order recursive type witness missing');
  const fTy=Pi(C('Cls.N'),Apps(C('Cls.HO'),[C('Cls.A'),C('Cls.j0')]));
  checkAndAddDeclaration(env,{kind:'axiom',name:'Cls.f',levelParams:[],type:fTy});
  const motive=Lam(C('Cls.J'),Lam(Apps(C('Cls.HO'),[C('Cls.A'),B(0)]),C('Cls.N')));
  const minor=Lam(fTy,Lam(Pi(C('Cls.N'),C('Cls.N')),App(B(0),C('Cls.n0'))));
  const app=Apps(C('Cls.HO.rec',[L1]),[C('Cls.A'),motive,minor,C('Cls.j1'),Apps(C('Cls.HO.mk'),[C('Cls.A'),C('Cls.f')])]);
  const expected=Apps(C('Cls.HO.rec',[L1]),[C('Cls.A'),motive,minor,C('Cls.j0'),App(C('Cls.f'),C('Cls.n0'))]);
  assertWhnfEq(env,'higher-order indexed pointwise IH normalized by classifier witness',app,expected);
}

const EqLike={kind:'inductive',name:'Cls.EqLike',levelParams:['u'],type:Pi(S(u),Pi(B(0),Pi(B(1),S(L0)))),numParams:2,numIndices:1,constructors:[
  {name:'Cls.EqLike.refl',type:Pi(S(u),Pi(B(0),Apps(C('Cls.EqLike',[u]),[B(1),B(0),B(0)])))},
]};
{
  const {env,md}=accept(EqLike); assert.equal(md.numParams,2); assert.equal(md.numIndices,1); assert.deepEqual(md.rules[0].recursiveFields,[]);
}

const NegativeDomain={kind:'inductive',name:'Cls.NegDom',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Cls.NegDom.mk',type:Pi(S(L1),Pi(Pi(App(C('Cls.NegDom'),B(0)),C('Cls.N')),App(C('Cls.NegDom'),B(1))))},
]};
reject(NegativeDomain,/non-positive occurrence|non-direct or negative|negative recursive occurrence/);

const BadIndexRec={kind:'inductive',name:'Cls.BadIndexRec',levelParams:[],type:Pi(S(L1),Pi(S(L2),S(L3))),numParams:1,numIndices:1,constructors:[
  {name:'Cls.BadIndexRec.mk',type:Pi(S(L1),Pi(S(L2),Pi(Apps(C('Cls.BadIndexRec'),[B(1),Apps(C('Cls.BadIndexRec'),[B(1),B(0)])]),Apps(C('Cls.BadIndexRec'),[B(2),B(1)]))))},
]};
reject(BadIndexRec,/inside an index|inductive target argument|type mismatch|universe level/);

const BadResultParam={kind:'inductive',name:'Cls.BadResultParam',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'Cls.BadResultParam.mk',type:Pi(S(L1),App(C('Cls.BadResultParam'),C('Cls.N')))},
]};
reject(BadResultParam,/constructor result parameter 0 is not the corresponding uniform parameter|codomain parameter 0 is not the uniform family parameter binder/);

const BadFieldUniverse={kind:'inductive',name:'Cls.BadFieldUniverse',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'Cls.BadFieldUniverse.mk',type:Pi(S(L1),C('Cls.BadFieldUniverse'))},
]};
reject(BadFieldUniverse,/universe level of type_of/);

const PropHuge={kind:'inductive',name:'Cls.PropHuge',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
  {name:'Cls.PropHuge.mk',type:Pi(S(L2),C('Cls.PropHuge'))},
]};
{
  const {env}=accept(PropHuge); assert.ok(env.has('Cls.PropHuge.mk'));
}

console.log('CLASSIFIER_VECTOR_POSITIVE=5');
console.log('CLASSIFIER_VECTOR_NEGATIVE=4');
console.log('CLASSIFIER_VECTOR_PROP_EXEMPTION=1');
console.log('CLASSIFIER_VECTOR_WHNF_DEFEQ_CASES=3');
console.log('CLASSIFIER_VECTOR_HIGHER_ORDER_POINTWISE_IH=1');
console.log('CLASSIFIER_VECTOR_ATOMIC_REJECTIONS=4');
console.log('CLASSIFIER_VECTOR_FAILURES=0');
console.log('PASS KERNEL-inductive-nonmutual-classifier-vectors v71');
