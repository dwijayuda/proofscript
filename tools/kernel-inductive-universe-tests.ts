import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {
  Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,levelParam,levelSucc,levelMax
} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelInductiveUniversesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),L2=levelOfNat(2);
const U=levelParam('u'),V=levelParam('v');
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const env21=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true});
const env20=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true});
const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)};

const SmallNat={kind:'inductive',name:'SmallNatU',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'SmallNatU.mk',type:Pi(C('N'),C('SmallNatU'))}]};
const SmallType={kind:'inductive',name:'SmallTypeU',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'SmallTypeU.mk',type:Pi(S(L1),C('SmallTypeU'))}]};
const BigType={kind:'inductive',name:'BigTypeU',levelParams:[],type:S(L2),numParams:0,numIndices:0,constructors:[{name:'BigTypeU.mk',type:Pi(S(L1),C('BigTypeU'))}]};
const PropHuge={kind:'inductive',name:'PropHugeU',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PropHugeU.mk',type:Pi(S(levelOfNat(11)),C('PropHugeU'))}]};

// A field in Type is accepted by a Type-valued inductive at the same universe,
// rejected when the field's type itself lives one universe higher, and accepted
// again when the inductive result universe is raised to match.
{
  const e=env21();checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,SmallNat);checkAndAddDeclaration(e,BigType);
  assert.throws(()=>checkAndAddDeclaration(e,SmallType),/universe level of type_of\(arg #1\) is too big/);
}

// Prop is impredicative: constructor fields may come from arbitrarily high universes.
{
  const e=env21();checkAndAddDeclaration(e,PropHuge);assert.ok(e.has('PropHugeU.mk'));
}

// Uniform parameters are exempt from the constructor-field universe ceiling.
const ParamHigh={kind:'inductive',name:'ParamHighU',levelParams:['u'],type:Pi(S(levelSucc(U)),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ParamHighU.mk',type:Pi(S(levelSucc(U)),App(C('ParamHighU',[U]),B(0)))}
]};
{
  const e=env21();checkAndAddDeclaration(e,ParamHigh);assert.ok(e.has('ParamHighU.mk'));
}

// The same high-universe parameter, when stored as a constructor field, is no
// longer exempt and must satisfy the inductive result-universe ceiling.
const BadParamField={kind:'inductive',name:'BadParamFieldU',levelParams:['u'],type:Pi(S(levelSucc(U)),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BadParamFieldU.mk',type:Pi(S(levelSucc(U)),Pi(B(0),App(C('BadParamFieldU',[U]),B(1))))}
]};
{
  const e=env21();assert.throws(()=>checkAndAddDeclaration(e,BadParamField),/universe level of type_of\(arg #2\) is too big/);
  const old=env20();checkAndAddDeclaration(old,BadParamField); // frozen v20 semantics stay unchanged
}

// Polymorphic same-level storage: α : Type u may be stored by a family in Type u.
const Box={kind:'inductive',name:'BoxU',levelParams:['u'],type:Pi(S(levelSucc(U)),S(levelSucc(U))),numParams:1,numIndices:0,constructors:[
  {name:'BoxU.mk',type:Pi(S(levelSucc(U)),Pi(B(0),App(C('BoxU',[U]),B(1))))}
]};
{
  const e=env21();checkAndAddDeclaration(e,Box);assert.ok(e.has('BoxU.mk'));
}

// A field from Type (u+1) cannot be stored in Type u.
const BadBox={kind:'inductive',name:'BadBoxU',levelParams:['u'],type:Pi(S(levelSucc(levelSucc(U))),S(levelSucc(U))),numParams:1,numIndices:0,constructors:[
  {name:'BadBoxU.mk',type:Pi(S(levelSucc(levelSucc(U))),Pi(B(0),App(C('BadBoxU',[U]),B(1))))}
]};
{
  const e=env21();assert.throws(()=>checkAndAddDeclaration(e,BadBox),/universe level of type_of\(arg #2\) is too big/);
}

// max u v result universes must dominate fields from both component universes.
const UV=levelMax(U,V),SUV=levelSucc(UV);
const MaxBox={kind:'inductive',name:'MaxBoxU',levelParams:['u','v'],type:Pi(S(levelSucc(U)),Pi(S(levelSucc(V)),S(SUV))),numParams:2,numIndices:0,constructors:[
  {name:'MaxBoxU.mk',type:Pi(S(levelSucc(U)),Pi(S(levelSucc(V)),Pi(B(1),Pi(B(1),Apps(C('MaxBoxU',[U,V]),[B(3),B(2)])))))}
]};
{
  const e=env21();checkAndAddDeclaration(e,MaxBox);assert.ok(e.has('MaxBoxU.mk'));
}

// Indexed case: constructor-local data fields obey the same ceiling while
// uniform parameters remain exempt.
const IndexedBad={kind:'inductive',name:'IndexedBadU',levelParams:['u'],type:Pi(S(levelSucc(U)),Pi(C('N'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'IndexedBadU.mk',type:Pi(S(levelSucc(U)),Pi(B(0),Apps(C('IndexedBadU',[U]),[B(1),C('nIdx')])))}
]};
const nIdx={kind:'axiom',name:'nIdx',levelParams:[],type:C('N')};
{
  const e=env21();checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,nIdx);assert.throws(()=>checkAndAddDeclaration(e,IndexedBad),/universe level of type_of\(arg #2\) is too big/);
}

// v21 serialization/replay is accepted; mismatched format/profile pairs reject.
{
  const declarations=[N,SmallNat,BigType,PropHuge,ParamHigh,Box,MaxBox];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-inductive-universes0').status,'accepted');
  const artifact=makeKernelInductiveUniversesArtifact(declarations);assert.equal(artifact.formatVersion,21);assert.equal(artifact.implementationProfile,'KERNEL-inductive-universes0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:20}),/unsupported v20 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-recursor-k0'}),/unsupported v21 implementation profile/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-ind-univ-'));const file=path.join(dir,'u.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  assert.equal(verifyFile(file,new Set(['N'])).status,'accepted');fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 admission differential.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-ind-univ-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`universe u v\ninductive SmallNat : Type where | mk : Nat → SmallNat\ninductive BigType : Type 1 where | mk : Type → BigType\ninductive PropHuge : Prop where | mk : Type 10 → PropHuge\ninductive ParamHigh (α : Type u) : Type where | mk : ParamHigh α\ninductive Box (α : Type u) : Type u where | mk : α → Box α\ninductive MaxBox (α : Type u) (β : Type v) : Type (max u v) where | mk : α → β → MaxBox α β\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const badCases=[
    ['SmallType.lean',`inductive SmallType : Type where | mk : Type → SmallType\n`],
    ['BadParamField.lean',`universe u\ninductive BadParamField (α : Type u) : Type where | mk : α → BadParamField α\n`],
    ['BadBox.lean',`universe u\ninductive BadBox (α : Type (u+1)) : Type u where | mk : α → BadBox α\n`],
  ];
  for(const [name,src] of badCases){const f=path.join(dir,name);fs.writeFileSync(f,src);const r=spawnSync(lean,[f],{encoding:'utf8'});assert.notEqual(r.status,0,`${name} unexpectedly accepted`);assert.match(r.stderr+r.stdout,/universe level .*too big|Invalid universe level/i);}
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_INDUCTIVE_UNIVERSES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-inductive-universes0',coreFormat:21,status:'accepted',observations:{sameUniverseField:'accepted',higherFieldRejected:'accepted',raisedResultUniverse:'accepted',propImpredicativity:'accepted',uniformParameterExempt:'accepted',storedHighParameterRejected:'accepted',polymorphicSameLevel:'accepted',successorMismatchRejected:'accepted',maxUniverseDominance:'accepted',indexedFieldCeiling:'accepted'},historicalIsolation:{v20RetainsPreConstraintAdmission:true}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log(`✓ kernel v21 Lean 4.33.1 constructor-field universe ceilings, Prop exception, uniform-parameter exemption, polymorphic/max cases, indexed admission, replay, and historical isolation passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
