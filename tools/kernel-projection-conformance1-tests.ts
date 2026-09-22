import assert from 'node:assert/strict';
import {Environment,checkAndAddDeclaration,infer,kernelWhnf,sameTerm,levelOfNat} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level});
const B=index=>({tag:'bvar',index});
const C=(name,levels=[])=>({tag:'const',name,levels});
const App=(fn,arg)=>({tag:'app',fn,arg});
const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'});
const P=(typeName,index,expr)=>({tag:'proj',typeName,index,expr});

const baseOptions={
  recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,
  allowStructureEta:true,allowHigherOrderPositiveRecursion:true,
  allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,
  allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,
  allowDependentConstructorFields:true,allowTelescopeTerms:true,
};
const exactEnv=()=>new Environment({...baseOptions,allowProjectionConformance:true});
const legacyEnv=()=>new Environment({...baseOptions,allowProjectionConformance:false});

const J={kind:'axiom',name:'J',levelParams:[],type:S(L1)};
const A={kind:'axiom',name:'A',levelParams:[],type:S(L1)};
const j={kind:'axiom',name:'j',levelParams:[],type:C('J')};
const a={kind:'axiom',name:'a',levelParams:[],type:C('A')};
const RawDep={kind:'inductive',name:'RawDep',levelParams:[],type:Pi(C('J'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'RawDep.mk',type:Pi(C('J'),Pi(C('A'),App(C('RawDep'),B(1))))}
]};

const Pred={kind:'axiom',name:'Pred',levelParams:[],type:Pi(C('Nat'),S(L0))};
const Q={kind:'axiom',name:'Q',levelParams:[],type:S(L0)};
const Nat={kind:'axiom',name:'Nat',levelParams:[],type:S(L1)};
const RawWitness={kind:'inductive',name:'RawWitness',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
  {name:'RawWitness.mk',type:Pi(C('Nat'),Pi(App(C('Pred'),B(0)),C('RawWitness')))}
]};
const RawWitnessIndependent={kind:'inductive',name:'RawWitnessIndependent',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
  {name:'RawWitnessIndependent.mk',type:Pi(C('Nat'),Pi(C('Q'),C('RawWitnessIndependent')))}
]};

function addAll(env,decls){for(const d of decls)checkAndAddDeclaration(env,d);return env;}

// Raw kernel metadata: exact Lean permits the two constructor fields of this
// nparams=0/nindices=1 declaration. This protects against confusing source-level
// parameter generalization with kernel projection semantics.
{
  const env=addAll(exactEnv(),[J,A,j,a,RawDep]);
  checkAndAddDeclaration(env,{kind:'axiom',name:'d',levelParams:[],type:App(C('RawDep'),C('j'))});
  const major=C('d');
  assert.ok(sameTerm(infer(env,[],P('RawDep',0,major)),C('J')));
  assert.ok(sameTerm(infer(env,[],P('RawDep',1,major)),C('A')));
  assert.throws(()=>infer(env,[],P('RawDep',2,major)),/invalid projection/);
  const built={tag:'app',fn:{tag:'app',fn:C('RawDep.mk'),arg:C('j')},arg:C('a')};
  assert.ok(sameTerm(kernelWhnf(env,P('RawDep',0,built)),C('j')));
  assert.ok(sameTerm(kernelWhnf(env,P('RawDep',1,built)),C('a')));
}

// Exact Lean 4.33.1 Prop projection rule:
// - data target itself is invalid;
// - a later proof field depending on that data is invalid because reconstructing
//   its type would require an illegal data projection from Prop;
// - an independent later proof field is valid because the unused data binder can
//   be dropped without materializing a projection.
{
  const env=addAll(exactEnv(),[Nat,Pred,Q,RawWitness,RawWitnessIndependent]);
  checkAndAddDeclaration(env,{kind:'axiom',name:'w',levelParams:[],type:C('RawWitness')});
  checkAndAddDeclaration(env,{kind:'axiom',name:'wi',levelParams:[],type:C('RawWitnessIndependent')});
  assert.throws(()=>infer(env,[],P('RawWitness',0,C('w'))),/data-valued/);
  assert.throws(()=>infer(env,[],P('RawWitness',1,C('w'))),/dependency crosses data-valued/);
  assert.throws(()=>infer(env,[],P('RawWitnessIndependent',0,C('wi'))),/data-valued/);
  assert.ok(sameTerm(infer(env,[],P('RawWitnessIndependent',1,C('wi'))),C('Q')));
}

// Historical v69 behavior is retained behind the profile flag, documenting the
// exact counterexample that makes v69 unsuitable as the equivalence candidate.
{
  const env=addAll(legacyEnv(),[Nat,Pred,Q,RawWitness,RawWitnessIndependent]);
  checkAndAddDeclaration(env,{kind:'axiom',name:'w',levelParams:[],type:C('RawWitness')});
  checkAndAddDeclaration(env,{kind:'axiom',name:'wi',levelParams:[],type:C('RawWitnessIndependent')});
  assert.ok(sameTerm(infer(env,[],P('RawWitness',1,C('w'))),App(C('Pred'),P('RawWitness',0,C('w')))));
  assert.ok(sameTerm(infer(env,[],P('RawWitnessIndependent',1,C('wi'))),C('Q')));
}

console.log('PASS KERNEL-projection-conformance1: raw indexed metadata, projection iota, exact Prop dependency gating, and historical-v69 counterexample isolation');
