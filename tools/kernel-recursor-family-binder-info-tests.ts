import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,binderInfoOf,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelRecursorFamilyBinderInfoArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);const S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const common={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true};
const env48=()=>new Environment({...common,allowRecursorFamilyBinderInfo:true}),env47=()=>new Environment(common);
const binders=t=>{const out=[];let cur=t;while(cur.tag==='pi'){out.push(cur);cur=cur.body;}return out;};

const Alpha={kind:'axiom',name:'AlphaRBI48',levelParams:[],type:S(L1)},a0={kind:'axiom',name:'a0RBI48',levelParams:[],type:C('AlphaRBI48')};
const Out={kind:'axiom',name:'OutRBI48',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0RBI48',levelParams:[],type:C('OutRBI48')};
const N={kind:'axiom',name:'NRBI48',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0RBI48',levelParams:[],type:C('NRBI48')};

// Parameterized recursion: strict-implicit source parameter stays strict-implicit in v48.
const T={kind:'inductive',name:'TRBI48',levelParams:[],type:Pi(S(L1),S(L1),'strictImplicit'),numParams:1,numIndices:0,constructors:[
 {name:'TRBI48.leaf',type:Pi(S(L1),Pi(B(0),App(C('TRBI48'),B(1))),'strictImplicit')},
 {name:'TRBI48.mk',type:Pi(S(L1),Pi(App(C('TRBI48'),B(0)),App(C('TRBI48'),B(1))),'strictImplicit')},
]};
{
 const e=env48();for(const d of [Alpha,a0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,T);const rec=e.get('TRBI48.rec').declaration;const bs=binders(rec.type);
 assert.equal(binderInfoOf(bs[0]),'strictImplicit');assert.equal(binderInfoOf(bs[1]),'implicit');
 const tA=App(C('TRBI48'),C('AlphaRBI48'));const leaf=Apps(C('TRBI48.leaf'),[C('AlphaRBI48'),C('a0RBI48')]),major=Apps(C('TRBI48.mk'),[C('AlphaRBI48'),leaf]);
 const motive=Lam(tA,C('OutRBI48')),minorLeaf=Lam(C('AlphaRBI48'),C('out0RBI48')),minorMk=Lam(tA,Lam(C('OutRBI48'),B(0)));
 const term=Apps(C('TRBI48.rec',[L1]),[C('AlphaRBI48'),motive,minorLeaf,minorMk,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0RBI48')),`strict parameter iota mismatch: ${pretty(kernelWhnf(e,term))}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('OutRBI48')));
}
// Historical v47 admits the same source but generated an ordinary implicit outer parameter.
{
 const e=env47();checkAndAddDeclaration(e,T);const bs=binders(e.get('TRBI48.rec').declaration.type);assert.equal(binderInfoOf(bs[0]),'implicit');
}

// Instance-implicit source parameters are preserved, while explicit parameters still become implicit.
const Inst={kind:'inductive',name:'InstRBI48',levelParams:[],type:Pi(S(L1),S(L1),'instImplicit'),numParams:1,numIndices:0,constructors:[{name:'InstRBI48.mk',type:Pi(S(L1),App(C('InstRBI48'),B(0)),'instImplicit')}]};
const Explicit={kind:'inductive',name:'ExplicitRBI48',levelParams:[],type:Pi(S(L1),S(L1),'explicit'),numParams:1,numIndices:0,constructors:[{name:'ExplicitRBI48.mk',type:Pi(S(L1),App(C('ExplicitRBI48'),B(0)),'explicit')}]};
{
 const e=env48();checkAndAddDeclaration(e,Inst);checkAndAddDeclaration(e,Explicit);assert.equal(binderInfoOf(binders(e.get('InstRBI48.rec').declaration.type)[0]),'instImplicit');assert.equal(binderInfoOf(binders(e.get('ExplicitRBI48.rec').declaration.type)[0]),'implicit');
}

// Indexed recursors: motive index keeps source BinderInfo; final outer index uses explicit->implicit/otherwise preserve.
const IX={kind:'inductive',name:'IXRBI48',levelParams:[],type:Pi(S(L1),Pi(C('NRBI48'),S(L1),'strictImplicit'),'strictImplicit'),numParams:1,numIndices:1,constructors:[
 {name:'IXRBI48.z',type:Pi(S(L1),Apps(C('IXRBI48'),[B(0),C('n0RBI48')]),'strictImplicit')},
]};
{
 const e=env48();for(const d of [N,n0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,IX);const rec=e.get('IXRBI48.rec').declaration,bs=binders(rec.type);
 assert.deepEqual(bs.map(binderInfoOf),['strictImplicit','implicit','explicit','strictImplicit','explicit']);
 const motiveDomain=bs[1].domain;assert.equal(motiveDomain.tag,'pi');assert.equal(binderInfoOf(motiveDomain),'strictImplicit');
 const old=env47();for(const d of [N,n0])checkAndAddDeclaration(old,d);checkAndAddDeclaration(old,IX);const obs=binders(old.get('IXRBI48.rec').declaration.type);assert.equal(binderInfoOf(obs[0]),'implicit');assert.equal(binderInfoOf(obs[3]),'implicit');assert.equal(binderInfoOf(obs[1].domain),'strictImplicit');
}

// Empty inductives promote params+indices to recursor parameters but preserve strict/instance kinds in v48.
const Empty={kind:'inductive',name:'EmptyRBI48',levelParams:[],type:Pi(S(L1),Pi(C('NRBI48'),S(L1),'strictImplicit'),'instImplicit'),numParams:1,numIndices:1,constructors:[]};
{
 const e=env48();checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,Empty);const bs=binders(e.get('EmptyRBI48.rec').declaration.type);assert.deepEqual(bs.slice(0,2).map(binderInfoOf),['instImplicit','strictImplicit']);
 const old=env47();checkAndAddDeclaration(old,N);checkAndAddDeclaration(old,Empty);assert.deepEqual(binders(old.get('EmptyRBI48.rec').declaration.type).slice(0,2).map(binderInfoOf),['implicit','implicit']);
}

// Mutual recursors use the same rule for shared parameters and final indices.
const M={kind:'mutualInductive',name:'MutualRBI48',levelParams:[],inductives:[
 {name:'ARBI48',type:Pi(S(L1),Pi(C('NRBI48'),S(L1),'strictImplicit'),'strictImplicit'),numParams:1,numIndices:1,constructors:[
   {name:'ARBI48.z',type:Pi(S(L1),Apps(C('ARBI48'),[B(0),C('n0RBI48')]),'strictImplicit')},
   {name:'ARBI48.b',type:Pi(S(L1),Pi(Apps(C('BRBI48'),[B(0),C('n0RBI48')]),Apps(C('ARBI48'),[B(1),C('n0RBI48')])),'strictImplicit')},
 ]},
 {name:'BRBI48',type:Pi(S(L1),Pi(C('NRBI48'),S(L1),'strictImplicit'),'strictImplicit'),numParams:1,numIndices:1,constructors:[
   {name:'BRBI48.z',type:Pi(S(L1),Apps(C('BRBI48'),[B(0),C('n0RBI48')]),'strictImplicit')},
 ]},
]};
{
 const e=env48();for(const d of [N,n0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,M);for(const name of ['ARBI48.rec','BRBI48.rec']){const bs=binders(e.get(name).declaration.type);assert.equal(binderInfoOf(bs[0]),'strictImplicit');assert.equal(binderInfoOf(bs.at(-2)),'strictImplicit');}
}

// Nested synthetic mutual helpers inherit the v48 family-binder policy.
const Box={kind:'inductive',name:'BoxRBI48',levelParams:[],type:Pi(S(L1),S(L1),'strictImplicit'),numParams:1,numIndices:0,constructors:[{name:'BoxRBI48.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxRBI48'),B(1))),'strictImplicit')}]};
const Tree={kind:'inductive',name:'TreeRBI48',levelParams:[],type:Pi(S(L1),S(L1),'strictImplicit'),numParams:1,numIndices:0,constructors:[
 {name:'TreeRBI48.leaf',type:Pi(S(L1),App(C('TreeRBI48'),B(0)),'strictImplicit')},
 {name:'TreeRBI48.node',type:Pi(S(L1),Pi(App(C('BoxRBI48'),App(C('TreeRBI48'),B(0))),App(C('TreeRBI48'),B(1))),'strictImplicit')},
]};
{
 const e=env48();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Tree);for(const name of ['TreeRBI48.rec','TreeRBI48.rec_1'])assert.equal(binderInfoOf(binders(e.get(name).declaration.type)[0]),'strictImplicit');
 const old=env47();checkAndAddDeclaration(old,Box);checkAndAddDeclaration(old,Tree);for(const name of ['TreeRBI48.rec','TreeRBI48.rec_1'])assert.equal(binderInfoOf(binders(old.get(name).declaration.type)[0]),'implicit');
}

// Strict Core 48 serialization/replay. Source can be relabeled to v47 only by changing both format+profile, which intentionally regenerates the historical shape.
{
 const declarations=[N,n0,T,Inst,Explicit,IX,Empty,Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-recursor-family-binder-info0').status,'accepted');assert.equal(checkCoreDeclarations(declarations,'KERNEL-uniform-parameter-defeq0').status,'accepted');
 const artifact=makeKernelRecursorFamilyBinderInfoArtifact(declarations);assert.equal(artifact.formatVersion,48);assert.equal(artifact.implementationProfile,'KERNEL-recursor-family-binder-info0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:47}),/unsupported v47 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-uniform-parameter-defeq0'}),/unsupported v48 implementation profile/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v48-')),file=path.join(dir,'v48.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NRBI48','n0RBI48']));assert.equal(replay.status,'accepted',replay.message);assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v48-lean-')),good=path.join(dir,'Good.lean');
 fs.writeFileSync(good,`set_option pp.explicit true\ninductive E (α : Type) where | mk : α → E α\ninductive S ⦃α : Type⦄ where | mk : α → S (α:=α)\nclass C (α : Type) where\ninductive Inst [c : C Nat] where | mk : Inst\ninductive IX (α : Type) : ⦃n : Nat⦄ → Type where | z : IX α (n:=0)\ninductive ES : ⦃n : Nat⦄ → Type\nmutual\n  inductive A ⦃α : Type⦄ : Nat → Type where | z : A (α:=α) 0 | b : B (α:=α) 0 → A (α:=α) 1\n  inductive B ⦃α : Type⦄ : Nat → Type where | z : B (α:=α) 0\nend\ninductive Box ⦃α : Type⦄ where | mk : α → Box (α:=α)\ninductive T ⦃α : Type⦄ where | leaf : T (α:=α) | node : Box (α:=T (α:=α)) → T (α:=α)\n#print E.rec\n#print S.rec\n#print Inst.rec\n#print IX.rec\n#print ES.rec\n#print A.rec\n#print T.rec\n#print T.rec_1\n`);
 const g=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(g.status,0,g.stderr||g.stdout);
 assert.match(g.stdout,/recursor E\.rec\.\{u\} : \{α : Type\}/);assert.match(g.stdout,/recursor S\.rec\.\{u\} : ⦃α : Type⦄/);assert.match(g.stdout,/recursor Inst\.rec\.\{u\} : \[c : C Nat\]/);
 assert.match(g.stdout,/motive : ⦃n : Nat⦄ → @IX α n → Sort u/);assert.match(g.stdout,/⦃n : Nat⦄ → \(t : @IX α n\)/);assert.match(g.stdout,/recursor ES\.rec\.\{u\} : ⦃n : Nat⦄/);
 assert.match(g.stdout,/recursor A\.rec\.\{u\} : ⦃α : Type⦄/);assert.match(g.stdout,/recursor T\.rec\.\{u\} : ⦃α : Type⦄/);assert.match(g.stdout,/recursor T\.rec_1\.\{u\} : ⦃α : Type⦄/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_RECURSOR_FAMILY_BINDER_INFO_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-recursor-family-binder-info0',coreFormat:48,status:'accepted',observations:{explicitFamilyBinder:'mappedToImplicit',implicitFamilyBinder:'preservedImplicit',strictImplicitFamilyBinder:'preservedStrictImplicit',instanceImplicitFamilyBinder:'preservedInstanceImplicit',motiveIndexBinderInfo:'preservedSource',finalIndexBinderInfo:'explicitToImplicitOtherwisePreserved',emptyInductiveBinderInfo:'preservedByRule',mutualBinderInfo:'preservedByRule',nestedHelperBinderInfo:'preservedByRule',linkedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v47SourceAdmission:'accepted',v47GeneratedFamilyBinders:'ordinaryImplicit'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v48 recursor family BinderInfo policy, indexed motive/final indices, empty/mutual/nested recursors, iota, replay, historical shape isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
