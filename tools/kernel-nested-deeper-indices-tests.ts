import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperIndicesArtifact,makeKernelNestedDeeperParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true};
const env40=()=>new Environment({...base,allowNestedDeeperIndices:true}),env39=()=>new Environment(base);

const Nat={kind:'axiom',name:'NatNDI40',levelParams:[],type:S(L1)},zero={kind:'axiom',name:'zeroNDI40',levelParams:[],type:C('NatNDI40')},one={kind:'axiom',name:'oneNDI40',levelParams:[],type:C('NatNDI40')},succ={kind:'axiom',name:'succNDI40',levelParams:[],type:Pi(C('NatNDI40'),C('NatNDI40'))};
const Box={kind:'inductive',name:'BoxNDI40',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNDI40.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNDI40'),B(1))))}]};
const BB=t=>App(C('BoxNDI40'),App(C('BoxNDI40'),t)),BBB=t=>App(C('BoxNDI40'),BB(t));
const N={kind:'axiom',name:'ResultNDI40',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'result0NDI40',levelParams:[],type:C('ResultNDI40')};

// Closed/fixed indexed-outer mode: the public outer family stays indexed.
const Fixed={kind:'inductive',name:'FixedNDI40',levelParams:[],type:Pi(C('NatNDI40'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'FixedNDI40.leaf',type:App(C('FixedNDI40'),C('zeroNDI40'))},
  {name:'FixedNDI40.node',type:Pi(BB(App(C('FixedNDI40'),C('zeroNDI40'))),App(C('FixedNDI40'),C('oneNDI40')))},
]};
{
  const e=env40();for(const d of [Nat,zero,one,Box,N,n0])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Fixed);
  assert.deepEqual(checked.generated,['FixedNDI40.leaf','FixedNDI40.node','FixedNDI40.rec','FixedNDI40.rec_1','FixedNDI40.rec_2']);
  const r=e.get('FixedNDI40.rec').declaration,h1=e.get('FixedNDI40.rec_1').declaration,h2=e.get('FixedNDI40.rec_2').declaration;
  assert.equal(r.metadata.numParams,0);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,0,0]);assert.equal(h1.metadata.numIndices,0);assert.equal(h2.metadata.numIndices,0);
  const tree0=App(C('FixedNDI40'),C('zeroNDI40')),bb=BB(tree0),b=App(C('BoxNDI40'),tree0),R=C('ResultNDI40');
  const mT=Lam(C('NatNDI40'),Lam(App(C('FixedNDI40'),B(0)),R)),mBB=Lam(bb,R),mB=Lam(b,R);
  const leaf=C('result0NDI40'),node=Lam(bb,Lam(R,B(0))),outerMk=Lam(b,Lam(R,B(0))),innerMk=Lam(tree0,Lam(R,B(0)));
  const leafMajor=C('FixedNDI40.leaf'),inner=Apps(C('BoxNDI40.mk'),[tree0,leafMajor]),outer=Apps(C('BoxNDI40.mk'),[b,inner]),major=App(C('FixedNDI40.node'),outer);
  const term=Apps(C('FixedNDI40.rec',[L1]),[mT,mBB,mB,leaf,node,outerMk,innerMk,C('oneNDI40'),major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0NDI40')),`fixed deep-index iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),R));
}

// Captured/promoted mode: exact current indices become extra shared parameters.
const Capt={kind:'inductive',name:'CaptNDI40',levelParams:[],type:Pi(C('NatNDI40'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'CaptNDI40.leaf',type:Pi(C('NatNDI40'),App(C('CaptNDI40'),B(0)))},
  {name:'CaptNDI40.node',type:Pi(C('NatNDI40'),Pi(BB(App(C('CaptNDI40'),B(0))),App(C('CaptNDI40'),B(1))))},
]};
{
  const e=env40();for(const d of [Nat,zero,Box,N,n0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Capt);const r=e.get('CaptNDI40.rec').declaration;
  assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,0);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);
  const z=C('zeroNDI40'),tree=App(C('CaptNDI40'),z),bb=BB(tree),b=App(C('BoxNDI40'),tree),R=C('ResultNDI40');
  const mT=Lam(tree,R),mBB=Lam(bb,R),mB=Lam(b,R),leaf=C('result0NDI40'),node=Lam(bb,Lam(R,B(0))),outerMk=Lam(b,Lam(R,B(0))),innerMk=Lam(tree,Lam(R,B(0)));
  const leafMajor=App(C('CaptNDI40.leaf'),z),inner=Apps(C('BoxNDI40.mk'),[tree,leafMajor]),outer=Apps(C('BoxNDI40.mk'),[b,inner]),major=Apps(C('CaptNDI40.node'),[z,outer]);
  const term=Apps(C('CaptNDI40.rec',[L1]),[z,mT,mBB,mB,leaf,node,outerMk,innerMk,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0NDI40')),`captured deep-index iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),R));
}

// Fixed index expressions over uniform parameters retain outer indices and arbitrary depth.
const ParamFixed={kind:'inductive',name:'ParamFixedNDI40',levelParams:[],type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'ParamFixedNDI40.leaf',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Apps(C('ParamFixedNDI40'),[B(1),B(0)])))},
  {name:'ParamFixedNDI40.node',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(BBB(Apps(C('ParamFixedNDI40'),[B(1),B(1)])),Apps(C('ParamFixedNDI40'),[B(2),B(1)]))))},
]};
{
  const e=env40();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamFixed);const r=e.get('ParamFixedNDI40.rec').declaration;
  assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,0,0,0]);assert.ok(e.has('ParamFixedNDI40.rec_3'));assert.match(pretty(r.type),/ParamFixedNDI40/);
}

// Multiple dependent fixed outer indices are admitted when wholly parameter-derived.
const Ix={kind:'axiom',name:'IxNDI40',levelParams:[],type:Pi(C('NatNDI40'),S(L1))},ix={kind:'axiom',name:'ixNDI40',levelParams:[],type:Pi(C('NatNDI40'),App(C('IxNDI40'),B(0)))};
const DepFixed={kind:'inductive',name:'DepFixedNDI40',levelParams:[],type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'DepFixedNDI40.leaf',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),Apps(C('DepFixedNDI40'),[B(2),B(1),B(0)]))))},
  {name:'DepFixedNDI40.node',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),Pi(BB(Apps(C('DepFixedNDI40'),[B(2),B(2),App(C('ixNDI40'),B(2))])),Apps(C('DepFixedNDI40'),[B(3),B(2),B(1)])))))},
]};
{
  const e=env40();for(const d of [Nat,Ix,ix,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,DepFixed);const r=e.get('DepFixedNDI40.rec').declaration;
  assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,2);assert.deepEqual(r.metadata.mutual.indexCounts,[2,0,0]);assert.match(pretty(r.type),/ixNDI40/);
}

// Dependent captured indices are promoted together with their telescope dependency.
const DepCapt={kind:'inductive',name:'DepCaptNDI40',levelParams:[],type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'DepCaptNDI40.leaf',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),Apps(C('DepCaptNDI40'),[B(2),B(1),B(0)]))))},
  {name:'DepCaptNDI40.node',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('IxNDI40'),B(0)),Pi(BB(Apps(C('DepCaptNDI40'),[B(2),B(1),B(0)])),Apps(C('DepCaptNDI40'),[B(3),B(2),B(1)])))))},
]};
{
  const e=env40();for(const d of [Nat,Ix,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,DepCapt);const r=e.get('DepCaptNDI40.rec').declaration;
  assert.equal(r.metadata.numParams,3);assert.equal(r.metadata.numIndices,0);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);
}

// Mixed indexed container inside a captured deep chain preserves helper indices.
const Vec={kind:'inductive',name:'VecNDI40',levelParams:[],type:Pi(S(L1),Pi(C('NatNDI40'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'VecNDI40.nil',type:Pi(S(L1),Apps(C('VecNDI40'),[B(0),C('zeroNDI40')]))},
  {name:'VecNDI40.cons',type:Pi(S(L1),Pi(C('NatNDI40'),Pi(B(1),Pi(Apps(C('VecNDI40'),[B(2),B(1)]),Apps(C('VecNDI40'),[B(3),App(C('succNDI40'),B(2))])))))},
]};
const Mixed={kind:'inductive',name:'MixedNDI40',levelParams:[],type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'MixedNDI40.leaf',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Apps(C('MixedNDI40'),[B(1),B(0)])))},
  {name:'MixedNDI40.node',type:Pi(C('NatNDI40'),Pi(C('NatNDI40'),Pi(App(C('BoxNDI40'),Apps(C('VecNDI40'),[App(C('BoxNDI40'),Apps(C('MixedNDI40'),[B(1),B(0)])),B(0)])),Apps(C('MixedNDI40'),[B(2),B(1)]))))},
]};
{
  const e=env40();for(const d of [Nat,zero,succ,Box,Vec])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Mixed);const r=e.get('MixedNDI40.rec').declaration;
  assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.numIndices,0);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,1,0]);assert.ok(e.has('MixedNDI40.rec_3'));
}

// Nonuniform promotion and transformed constructor-local indices remain rejected.
const Nonuniform={kind:'inductive',name:'NonuniformNDI40',levelParams:[],type:Pi(C('NatNDI40'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'NonuniformNDI40.leaf',type:App(C('NonuniformNDI40'),C('zeroNDI40'))},
  {name:'NonuniformNDI40.node',type:Pi(C('NatNDI40'),Pi(BB(App(C('NonuniformNDI40'),B(0))),App(C('NonuniformNDI40'),B(1))))},
]};
const Changed={kind:'inductive',name:'ChangedNDI40',levelParams:[],type:Pi(C('NatNDI40'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'ChangedNDI40.leaf',type:Pi(C('NatNDI40'),App(C('ChangedNDI40'),B(0)))},
  {name:'ChangedNDI40.node',type:Pi(C('NatNDI40'),Pi(BB(App(C('ChangedNDI40'),App(C('succNDI40'),B(0)))),App(C('ChangedNDI40'),B(1))))},
]};
for(const D of [Nonuniform,Changed]){const e=env40();for(const d of [Nat,zero,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,D),/parameter|uniform|fixed|nested|recursive|positive|local/i);assert.equal(e.has(D.name),false);}

// Historical v39 retains indexed deep nesting as unavailable.
{
  const e=env39();for(const d of [Nat,zero,one,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Fixed),/recursive occurrence|positive|nested|direct|index/i);assert.equal(e.has('FixedNDI40'),false);
}

// Strict Core40 serialization/replay and historical v39 semantic-smuggling rejection.
{
  const declarations=[Nat,zero,one,Box,Fixed];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-indices0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-parameters0'),/recursive occurrence|positive|nested|direct|index/i);
  const artifact=makeKernelNestedDeeperIndicesArtifact(declarations);assert.equal(artifact.formatVersion,40);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-indices0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:39}),/unsupported v39 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-parameters0'}),/unsupported v40 implementation profile/);
  const historical=makeKernelNestedDeeperParametersArtifact([Nat,zero,one,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/recursive occurrence|positive|nested|direct|index/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-index-v40-')),file=path.join(dir,'v40.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatNDI40','zeroNDI40','oneNDI40']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-index-v40-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`axiom Ix : Nat → Type\naxiom ix : (n : Nat) → Ix n\ninductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Vec (α : Type) : Nat → Type where\n| nil : Vec α 0\n| cons : α → Vec α n → Vec α (n+1)\ninductive Fixed : Nat → Type where\n| leaf : Fixed 0\n| node : Box (Box (Fixed 0)) → Fixed 1\n#print Fixed.rec\n#check Fixed.rec_2\ninductive Capt (p : Nat) : Nat → Type where\n| leaf (i : Nat) : Capt p i\n| node (i : Nat) : Box (Box (Box (Capt p i))) → Capt p i\n#print Capt.rec\n#check Capt.rec_3\ninductive DepFixed (p : Nat) : (n : Nat) → Ix n → Type where\n| leaf (n : Nat) (x : Ix n) : DepFixed p n x\n| node (n : Nat) (x : Ix n) : Box (Box (DepFixed p p (ix p))) → DepFixed p n x\n#print DepFixed.rec\ninductive Mixed (p : Nat) : Nat → Type where\n| leaf (i : Nat) : Mixed p i\n| node (i : Nat) : Box (Vec (Box (Mixed p i)) i) → Mixed p i\n#print Mixed.rec\n#check Mixed.rec_3\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);const out=gr.stdout;assert.match(out,/number of indices: 1/);assert.match(out,/number of parameters: 2/);assert.match(out,/number of indices: 0/);assert.match(out,/DepFixed p p \(ix p\)/);assert.match(out,/Vec \(Box \(Mixed p a\)\)/);
  const bad1=path.join(dir,'Nonuniform.lean');fs.writeFileSync(bad1,`inductive Box (α : Type) : Type where | mk : α → Box α\ninductive T : Nat → Type where\n| leaf : T 0\n| node (n : Nat) : Box (Box (T n)) → T n\n`);const br1=spawnSync(lean,[bad1],{encoding:'utf8'});assert.notEqual(br1.status,0);assert.match(br1.stderr+br1.stdout,/parameters cannot contain local variables/i);
  const bad2=path.join(dir,'Changed.lean');fs.writeFileSync(bad2,`inductive Box (α : Type) : Type where | mk : α → Box α\ninductive T : Nat → Type where\n| leaf (n : Nat) : T n\n| node (n : Nat) : Box (Box (T (n+1))) → T n\n`);const br2=spawnSync(lean,[bad2],{encoding:'utf8'});assert.notEqual(br2.status,0);assert.match(br2.stderr+br2.stdout,/parameters cannot contain local variables/i);
  const noAuto=path.join(dir,'NoAuto.lean');fs.writeFileSync(noAuto,`inductive Box (α : Type) : Type where | mk : α → Box α\nset_option inductive.autoPromoteIndices false in\ninductive T : Nat → Type where\n| leaf (n : Nat) : T n\n| node (n : Nat) : Box (Box (T n)) → T n\n`);const nr=spawnSync(lean,[noAuto],{encoding:'utf8'});assert.notEqual(nr.status,0);assert.match(nr.stderr+nr.stdout,/parameters cannot contain local variables/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_INDICES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-indices0',coreFormat:40,status:'accepted',supportedSlice:'monomorphic indexed outer Type families with exactly one arbitrary-depth linear nested field; supports closed/fixed outer-index tuples over uniform parameters and Lean-style uniformly captured/promoted outer-index telescopes, including multiple/dependent indices and indexed containers',observations:{closedFixedDeepIndex:'accepted',capturedPromotedDeepIndex:'accepted',depth3Fixed:'accepted',depth3Captured:'accepted',dependentFixedIndices:'accepted',dependentCapturedIndices:'accepted',mixedIndexedContainer:'accepted',linkedIotaFixed:'accepted',linkedIotaCaptured:'accepted',nonuniformPromotion:'rejected',changedConstructorLocalIndex:'rejected',autoPromotionDisabled:'rejected',serializedReplay:'accepted'},historicalIsolation:{v39IndexedDeepSemantics:'rejected'},explicitGaps:{polymorphicDeepLayers:'unsupported',multipleDeepFields:'unsupported',nestedProp:'unsupported',generalMixedSpecializations:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v40 arbitrary-depth indexed-outer nested preprocessing: closed/fixed and captured/promoted modes, dependent indices, indexed containers, linked iota, rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
