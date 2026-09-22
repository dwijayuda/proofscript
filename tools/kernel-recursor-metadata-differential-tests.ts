import assert from 'node:assert/strict';
import {
  Environment, checkAndAddDeclaration, levelOfNat, levelParam
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),u=levelParam('u');
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
  allowLeanRecursorMinorOrder:true, allowRecursorFamilyBinderInfo:true,
  allowUniformParameterDefEq:true, allowConversionFinalAudit:true,
  allowResourceBounds:true, allowProjectionConformance:true,
};
const env=new Environment(opts);
const decls=[
  {kind:'axiom',name:'KARec.N',levelParams:[],type:S(L1)},
  {kind:'inductive',name:'KARec.U',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'KARec.U.mk',type:C('KARec.U')}]},
  {kind:'inductive',name:'KARec.B',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'KARec.B.mk',type:Pi(C('KARec.N'),C('KARec.B'))}]},
  {kind:'inductive',name:'KARec.L',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'KARec.L.nil',type:C('KARec.L')},
    {name:'KARec.L.cons',type:Pi(C('KARec.N'),Pi(C('KARec.L'),C('KARec.L')))}]},
  {kind:'inductive',name:'KARec.W',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'KARec.W.mk',type:Pi(S(L1),Pi(B(0),App(C('KARec.W'),B(1))))}]},
  {kind:'inductive',name:'KARec.Ix',levelParams:[],type:Pi(C('KARec.N'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'KARec.Ix.mk',type:Pi(C('KARec.N'),App(C('KARec.Ix'),B(0)))}]},
  {kind:'inductive',name:'KARec.Eqish',levelParams:['u'],type:
    Pi(S(u),Pi(B(0),Pi(B(1),S(L0)),'explicit'),'implicit'),numParams:2,numIndices:1,constructors:[
      {name:'KARec.Eqish.refl',type:
        Pi(S(u),Pi(B(0),Apps(C('KARec.Eqish',[u]),[B(1),B(0),B(0)]),'explicit'),'implicit')}]},
  {kind:'inductive',name:'KARec.Has',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
    {name:'KARec.Has.mk',type:Pi(C('KARec.N'),C('KARec.Has'))}]},
];
for(const d of decls) checkAndAddDeclaration(env,d);

function familyIsProp(decl){
  let t=decl.type; while(t.tag==='pi') t=t.body;
  return t.tag==='sort' && t.level.tag==='zero';
}
function derivedK(decl,meta){
  if(meta.mutual || decl.constructors.length!==1 || meta.rules.length!==1 || !familyIsProp(decl)) return false;
  let t=decl.constructors[0].type, binders=0; while(t.tag==='pi'){binders++;t=t.body;}
  return binders===decl.numParams && meta.rules[0].ctor===decl.constructors[0].name && meta.rules[0].nfields===0;
}
const expected=new Map([
  ['KARec.U.rec',{p:0,i:0,mot:1,min:1,firstMinor:1,firstIndex:2,major:2,k:false,rules:[['KARec.U.mk',0]]}],
  ['KARec.B.rec',{p:0,i:0,mot:1,min:1,firstMinor:1,firstIndex:2,major:2,k:false,rules:[['KARec.B.mk',1]]}],
  ['KARec.L.rec',{p:0,i:0,mot:1,min:2,firstMinor:1,firstIndex:3,major:3,k:false,rules:[['KARec.L.nil',0],['KARec.L.cons',2]]}],
  ['KARec.W.rec',{p:1,i:0,mot:1,min:1,firstMinor:2,firstIndex:3,major:3,k:false,rules:[['KARec.W.mk',1]]}],
  ['KARec.Ix.rec',{p:0,i:1,mot:1,min:1,firstMinor:1,firstIndex:2,major:3,k:false,rules:[['KARec.Ix.mk',1]]}],
  ['KARec.Eqish.rec',{p:2,i:1,mot:1,min:1,firstMinor:3,firstIndex:4,major:5,k:true,rules:[['KARec.Eqish.refl',0]]}],
  ['KARec.Has.rec',{p:0,i:0,mot:1,min:1,firstMinor:1,firstIndex:2,major:2,k:false,rules:[['KARec.Has.mk',1]]}],
]);
let cases=0;
for(const [recName,e] of expected){
  const entry=env.get(recName); assert.ok(entry,`missing ${recName}`); assert.equal(entry.declaration.kind,'recursor');
  const m=entry.declaration.metadata; const ind=env.get(m.inductive)?.declaration;
  assert.ok(ind && ind.kind==='inductive',`missing inductive ${m.inductive}`);
  const mot=m.mutual?.motiveCount??1;
  const firstMinor=m.numParams+mot;
  const firstIndex=firstMinor+m.numMinors;
  const major=firstIndex+m.numIndices;
  const rules=m.rules.map(r=>[r.ctor,r.nfields]);
  const k=derivedK(ind,m);
  assert.deepEqual({p:m.numParams,i:m.numIndices,mot,min:m.numMinors,firstMinor,firstIndex,major,k,rules},e,`${recName} metadata mismatch`);
  console.log(`REC_META ${recName} p=${e.p} i=${e.i} mot=${e.mot} min=${e.min} firstMinor=${e.firstMinor} firstIndex=${e.firstIndex} major=${e.major} k=${e.k} rules=[${e.rules.map(([n,f])=>`${n}:${f}`).join(',')}]`);
  cases++;
}
console.log(`RECURSOR_METADATA_TS_CASES=${cases} FAILURES=0`);
if(cases!==7) process.exit(1);
