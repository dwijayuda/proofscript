import {Environment,checkAndAddDeclaration,infer,kernelWhnf,sameTerm,levelOfNat} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}); const B=index=>({tag:'bvar',index});
const C=name=>({tag:'const',name,levels:[]}); const App=(fn,arg)=>({tag:'app',fn,arg});
const Pi=(domain,body)=>({tag:'pi',domain,body,binderInfo:'explicit'});
const P=(typeName,index,expr)=>({tag:'proj',typeName,index,expr});
const opts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,
  allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,
  allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,
  allowTelescopeTerms:true,allowProjectionConformance:true};
const env=new Environment(opts);
const decls=[
  {kind:'axiom',name:'J',levelParams:[],type:S(L1)}, {kind:'axiom',name:'A',levelParams:[],type:S(L1)},
  {kind:'axiom',name:'j',levelParams:[],type:C('J')}, {kind:'axiom',name:'a',levelParams:[],type:C('A')},
  {kind:'axiom',name:'Nat',levelParams:[],type:S(L1)}, {kind:'axiom',name:'Pred',levelParams:[],type:Pi(C('Nat'),S(L0))},
  {kind:'axiom',name:'Q',levelParams:[],type:S(L0)},
  {kind:'inductive',name:'RawDep',levelParams:[],type:Pi(C('J'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'RawDep.mk',type:Pi(C('J'),Pi(C('A'),App(C('RawDep'),B(1))))}]},
  {kind:'inductive',name:'RawWitness',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
    {name:'RawWitness.mk',type:Pi(C('Nat'),Pi(App(C('Pred'),B(0)),C('RawWitness')))}]},
  {kind:'inductive',name:'RawWitnessIndependent',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
    {name:'RawWitnessIndependent.mk',type:Pi(C('Nat'),Pi(C('Q'),C('RawWitnessIndependent')))}]},
  {kind:'axiom',name:'d',levelParams:[],type:App(C('RawDep'),C('j'))},
  {kind:'axiom',name:'w',levelParams:[],type:C('RawWitness')},
  {kind:'axiom',name:'wi',levelParams:[],type:C('RawWitnessIndependent')},
];
for(const d of decls)checkAndAddDeclaration(env,d);
let cases=0,failures=0;
function ok(cond){cases++;if(!cond)failures++;}
function rejects(fn){try{fn();return false}catch{return true}}
const built=App(App(C('RawDep.mk'),C('j')),C('a'));
for(let r=0;r<125;r++){
  ok(sameTerm(infer(env,[],P('RawDep',0,C('d'))),C('J')));
  ok(sameTerm(infer(env,[],P('RawDep',1,C('d'))),C('A')));
  ok(rejects(()=>infer(env,[],P('RawDep',2,C('d')))));
  ok(rejects(()=>infer(env,[],P('RawWitness',0,C('w')))));
  ok(rejects(()=>infer(env,[],P('RawWitness',1,C('w')))));
  ok(rejects(()=>infer(env,[],P('RawWitnessIndependent',0,C('wi')))));
  ok(sameTerm(infer(env,[],P('RawWitnessIndependent',1,C('wi'))),C('Q')));
  ok(sameTerm(kernelWhnf(env,P('RawDep',1,built)),C('a')));
}
console.log(`PROJECTION_TS_CASES=${cases} FAILURES=${failures}`);
if(cases!==1000||failures!==0)process.exit(1);
