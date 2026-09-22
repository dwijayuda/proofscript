import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualIndicesArtifact,makeKernelMutualParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true};
const env26=()=>new Environment({...baseOpts,allowMutualIndices:true});
const env25=()=>new Environment(baseOpts);

const Idx={kind:'axiom',name:'IdxMI',levelParams:[],type:S(L1)};
const i0={kind:'axiom',name:'i0MI',levelParams:[],type:C('IdxMI')};
const Flag={kind:'axiom',name:'FlagMI',levelParams:[],type:S(L1)};
const f0={kind:'axiom',name:'f0MI',levelParams:[],type:C('FlagMI')};
const Alpha={kind:'axiom',name:'AlphaMI',levelParams:[],type:S(L1)};
const Out={kind:'axiom',name:'OutMI',levelParams:[],type:S(L1)};
const out0={kind:'axiom',name:'out0MI',levelParams:[],type:C('OutMI')};

// Direct mutual indexed families, no uniform parameters.
const IndexedAB={kind:'mutualInductive',name:'IndexedABMutual',levelParams:[],inductives:[
  {name:'IAMut',type:Pi(C('IdxMI'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'IAMut.base',type:App(C('IAMut'),C('i0MI'))},
    {name:'IAMut.fromB',type:Pi(C('IdxMI'),Pi(App(C('IBMut'),B(0)),App(C('IAMut'),B(1))))},
  ]},
  {name:'IBMut',type:Pi(C('IdxMI'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'IBMut.fromA',type:Pi(C('IdxMI'),Pi(App(C('IAMut'),B(0)),App(C('IBMut'),B(1))))},
  ]},
]};

// v25 is the historical boundary: indexed mutual families must be rejected atomically.
{
  const e=env25();for(const d of [Idx,i0])checkAndAddDeclaration(e,d);
  assert.throws(()=>checkAndAddDeclaration(e,IndexedAB),/mutual indices are outside this kernel profile/);
  for(const m of IndexedAB.inductives){assert.equal(e.has(m.name),false);assert.equal(e.has(`${m.name}.rec`),false);}
}

// v26 generates index-aware motives and performs cross-family iota using the target indices.
{
  const e=env26();for(const d of [Idx,i0,Out,out0])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,IndexedAB);
  for(const name of ['IAMut','IBMut','IAMut.base','IAMut.fromB','IBMut.fromA','IAMut.rec','IBMut.rec'])assert.ok(e.has(name),`missing ${name}`);
  assert.deepEqual(checked.generated,['IAMut','IAMut.base','IAMut.fromB','IAMut.rec','IBMut','IBMut.fromA','IBMut.rec']);
  const idx=C('IdxMI'),z=C('i0MI'),out=C('OutMI');
  const motiveA=Lam(idx,Lam(App(C('IAMut'),B(0)),out));
  const motiveB=Lam(idx,Lam(App(C('IBMut'),B(0)),out));
  const minorBase=C('out0MI');
  const minorFromB=Lam(idx,Lam(App(C('IBMut'),B(0)),Lam(out,C('out0MI'))));
  const minorFromA=Lam(idx,Lam(App(C('IAMut'),B(0)),Lam(out,C('out0MI'))));
  const abase=C('IAMut.base');
  const bmajor=Apps(C('IBMut.fromA'),[z,abase]);
  const amajor=Apps(C('IAMut.fromB'),[z,bmajor]);
  const prefix=[motiveA,motiveB,minorBase,minorFromB,minorFromA];
  const arec=Apps(C('IAMut.rec',[L1]),[...prefix,z,amajor]);
  const brec=Apps(C('IBMut.rec',[L1]),[...prefix,z,bmajor]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('out0MI')),`indexed mutual A iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
  assert.ok(sameTerm(kernelWhnf(e,brec),C('out0MI')),`indexed mutual B iota mismatch: ${pretty(kernelWhnf(e,brec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],arec)),C('OutMI')));
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],brec)),C('OutMI')));
  const ar=e.get('IAMut.rec').declaration.metadata,br=e.get('IBMut.rec').declaration.metadata;
  assert.equal(ar.numIndices,1);assert.equal(br.numIndices,1);assert.deepEqual(ar.mutual.indexCounts,[1,1]);
}

// Shared uniform parameter + member index. This composes the v25 and v26 slices.
const ParamIndexed={kind:'mutualInductive',name:'ParamIndexedMutual',levelParams:[],inductives:[
  {name:'PIA',type:Pi(S(L1),Pi(C('IdxMI'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'PIA.base',type:Pi(S(L1),Apps(C('PIA'),[B(0),C('i0MI')]))},
    {name:'PIA.fromB',type:Pi(S(L1),Pi(C('IdxMI'),Pi(Apps(C('PIB'),[B(1),B(0)]),Apps(C('PIA'),[B(2),B(1)]))))},
  ]},
  {name:'PIB',type:Pi(S(L1),Pi(C('IdxMI'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'PIB.fromA',type:Pi(S(L1),Pi(C('IdxMI'),Pi(Apps(C('PIA'),[B(1),B(0)]),Apps(C('PIB'),[B(2),B(1)]))))},
  ]},
]};
{
  const e=env26();for(const d of [Idx,i0,Alpha,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamIndexed);
  const alpha=C('AlphaMI'),idx=C('IdxMI'),z=C('i0MI'),out=C('OutMI');
  const motiveA=Lam(idx,Lam(Apps(C('PIA'),[alpha,B(0)]),out));
  const motiveB=Lam(idx,Lam(Apps(C('PIB'),[alpha,B(0)]),out));
  const minorBase=C('out0MI');
  const minorFromB=Lam(idx,Lam(Apps(C('PIB'),[alpha,B(0)]),Lam(out,C('out0MI'))));
  const minorFromA=Lam(idx,Lam(Apps(C('PIA'),[alpha,B(0)]),Lam(out,C('out0MI'))));
  const abase=App(C('PIA.base'),alpha);
  const bmajor=Apps(C('PIB.fromA'),[alpha,z,abase]);
  const amajor=Apps(C('PIA.fromB'),[alpha,z,bmajor]);
  const prefix=[alpha,motiveA,motiveB,minorBase,minorFromB,minorFromA];
  const arec=Apps(C('PIA.rec',[L1]),[...prefix,z,amajor]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('out0MI')),`parameterized indexed mutual iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],arec)),C('OutMI')));
}

// Different per-family index counts after a shared parameter. This exercises
// target-recursion index reconstruction instead of reusing the current indices.
const MixedIndices={kind:'mutualInductive',name:'MixedIndicesMutual',levelParams:[],inductives:[
  {name:'MIA',type:Pi(C('IdxMI'),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'MIA.mk',type:Pi(C('IdxMI'),Pi(Apps(C('MIB'),[B(0),C('f0MI')]),App(C('MIA'),B(1))))},
  ]},
  {name:'MIB',type:Pi(C('IdxMI'),Pi(C('FlagMI'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'MIB.mk',type:Pi(C('IdxMI'),Pi(C('FlagMI'),Pi(App(C('MIA'),B(1)),Apps(C('MIB'),[B(2),B(1)]))))},
  ]},
]};
{
  const e=env26();for(const d of [Idx,i0,Flag,f0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,MixedIndices);
  const p=C('i0MI'),flag=C('f0MI'),out=C('OutMI');
  const motiveA=Lam(App(C('MIA'),p),out);
  const motiveB=Lam(C('FlagMI'),Lam(Apps(C('MIB'),[p,B(0)]),out));
  const minorA=Lam(Apps(C('MIB'),[p,flag]),Lam(out,C('out0MI')));
  const minorB=Lam(C('FlagMI'),Lam(App(C('MIA'),p),Lam(out,C('out0MI'))));
  // We only need a real reducible MIB major to prove the 0->1 index transition.
  // Add an axiom major of MIA p so MIB.mk can be constructed without an infinite value.
  const seed={kind:'axiom',name:'seedMIA',levelParams:[],type:App(C('MIA'),p)};checkAndAddDeclaration(e,seed);
  const bmajor=Apps(C('MIB.mk'),[p,flag,C('seedMIA')]);
  const brec=Apps(C('MIB.rec',[L1]),[p,motiveA,motiveB,minorA,minorB,flag,bmajor]);
  assert.ok(sameTerm(kernelWhnf(e,brec),C('out0MI')),`mixed-index B iota mismatch: ${pretty(kernelWhnf(e,brec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],brec)),C('OutMI')));
  const aMajorFromB=Apps(C('MIA.mk'),[p,bmajor]);
  const arec=Apps(C('MIA.rec',[L1]),[p,motiveA,motiveB,minorA,minorB,aMajorFromB]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('out0MI')),`mixed-index A iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
}

// Negative admission cases must leave the environment unchanged.
const BadShort={kind:'mutualInductive',name:'BadShortMI',levelParams:[],inductives:[
  {name:'BSIA',type:S(L1),numParams:0,numIndices:1,constructors:[]},
  {name:'BSIB',type:Pi(C('IdxMI'),S(L1)),numParams:0,numIndices:1,constructors:[]},
]};
const BadRecArity={kind:'mutualInductive',name:'BadRecArityMI',levelParams:[],inductives:[
  {name:'BRA',type:Pi(C('IdxMI'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRA.mk',type:Pi(C('BRB'),App(C('BRA'),C('i0MI')))}]},
  {name:'BRB',type:Pi(C('IdxMI'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRB.mk',type:App(C('BRB'),C('i0MI'))}]},
]};
const BadRecNested={kind:'mutualInductive',name:'BadRecNestedMI',levelParams:[],inductives:[
  {name:'BRNA',type:Pi(S(L1),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRNA.mk',type:Pi(App(C('BRNB'),App(C('BRNA'),C('AlphaMI'))),App(C('BRNA'),C('AlphaMI')))}]},
  {name:'BRNB',type:Pi(S(L1),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRNB.mk',type:App(C('BRNB'),C('AlphaMI'))}]},
]};
const BadResultNested={kind:'mutualInductive',name:'BadResultNestedMI',levelParams:[],inductives:[
  {name:'BRXA',type:Pi(S(L1),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRXA.mk',type:App(C('BRXA'),App(C('BRXB'),C('AlphaMI')))}]},
  {name:'BRXB',type:Pi(S(L1),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BRXB.mk',type:App(C('BRXB'),C('AlphaMI'))}]},
]};
for(const [bad,re,extras] of [
  [BadShort,/index telescope shorter|family type telescope arity mismatch/,[]],
  [BadRecArity,/wrong parameter\/index arity|constructor type is not a type|Pi domain is not a type|expected sort/,[Idx,i0]],
  [BadRecNested,/recursive indices may not contain a mutual family occurrence|recursive occurrence inside inductive target argument|recursive occurrence of .* inside an index/,[Alpha]],
  [BadResultNested,/result indices may not contain a mutual family occurrence|recursive occurrence inside inductive target argument/,[Alpha]],
]){
  const e=env26();for(const d of extras)if(!e.has(d.name))checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,bad),re);
  for(const m of bad.inductives){assert.equal(e.has(m.name),false);assert.equal(e.has(`${m.name}.rec`),false);for(const c of m.constructors)assert.equal(e.has(c.name),false);}
}

// Serialization/replay and historical semantic isolation.
{
  const declarations=[Idx,i0,Out,out0,IndexedAB];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-indices0').status,'accepted');
  const historicalProfile = checkCoreDeclarations(declarations,'KERNEL-mutual-parameters0');assert.equal(historicalProfile.status,'unsupported');assert.match(historicalProfile.message ?? '',/mutual indices are outside this kernel profile/);
  const artifact=makeKernelMutualIndicesArtifact(declarations);assert.equal(artifact.formatVersion,26);assert.equal(artifact.implementationProfile,'KERNEL-mutual-indices0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:25}),/unsupported v25 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-parameters0'}),/unsupported v26 implementation profile/);
  const historical=makeKernelMutualParametersArtifact([Idx,i0,Out,out0]);
  const smuggled=decodeArtifact({...historical,declarations,formatVersion:25,implementationProfile:'KERNEL-mutual-parameters0'});
  const smuggledResult = checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile);assert.equal(smuggledResult.status,'unsupported');assert.match(smuggledResult.message ?? '',/mutual indices are outside this kernel profile/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-index-v26-'));const file=path.join(dir,'v26.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['IdxMI','i0MI','OutMI','out0MI']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 observations for indexed mutual recursors and rejection edges.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-index-lean-'));
  const good=path.join(dir,'Good.lean');
  fs.writeFileSync(good,`mutual\n  inductive IA : Nat → Type where\n  | base : IA 0\n  | fromB {n : Nat} : IB n → IA n\n  inductive IB : Nat → Type where\n  | fromA {n : Nat} : IA n → IB n\nend\nexample : IA.rec (motive_1 := fun _ _ => Nat) (motive_2 := fun _ _ => Nat) 0 (fun {_} _ _ => 1) (fun {_} _ _ => 2) (IA.fromB (IB.fromA IA.base)) = 1 := rfl\nexample : IB.rec (motive_1 := fun _ _ => Nat) (motive_2 := fun _ _ => Nat) 0 (fun {_} _ _ => 1) (fun {_} _ _ => 2) (IB.fromA IA.base) = 2 := rfl\n\nmutual\n  inductive PIA (α : Type) : Nat → Type where\n  | base : PIA α 0\n  | fromB {n : Nat} : PIB α n → PIA α n\n  inductive PIB (α : Type) : Nat → Type where\n  | fromA {n : Nat} : PIA α n → PIB α n\nend\nexample (α : Type) : PIA.rec (α := α) (motive_1 := fun _ _ => Nat) (motive_2 := fun _ _ => Nat) 0 (fun {_} _ _ => 1) (fun {_} _ _ => 2) (PIA.fromB (PIB.fromA PIA.base)) = 1 := rfl\n\nmutual\n  inductive MA (n : Nat) : Type where\n  | mk : MB n true → MA n\n  inductive MB (n : Nat) : Bool → Type where\n  | mk {b : Bool} : MA n → MB n b\nend\n#print MA.rec\n#print MB.rec\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of indices: 0/);assert.match(gr.stdout,/number of indices: 1/);
  const badNested=path.join(dir,'BadNested.lean');fs.writeFileSync(badNested,`mutual\n  inductive NA : Type → Type where\n  | mk : NB (NA Nat) → NA Nat\n  inductive NB : Type → Type where\n  | mk : NB Nat\nend\n`);const nr=spawnSync(lean,[badNested],{encoding:'utf8'});assert.notEqual(nr.status,0);assert.match(nr.stderr+nr.stdout,/positive|nested|invalid/i);
  const badResult=path.join(dir,'BadResult.lean');fs.writeFileSync(badResult,`mutual\n  inductive RA : Type → Type where\n  | mk : RA (RB Nat)\n  inductive RB : Type → Type where\n  | mk : RB Nat\nend\n`);const rr=spawnSync(lean,[badResult],{encoding:'utf8'});assert.notEqual(rr.status,0);assert.match(rr.stderr+rr.stdout,/invalid return type|positive|nested/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_INDICES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-indices0',coreFormat:26,status:'accepted',supportedSlice:'direct Type mutual families with shared uniform parameters and per-member index telescopes',observations:{indexedMutualAdmission:'accepted',parameterizedIndexedMutual:'accepted',differentIndexCounts:'accepted',indexAwareMutualRecursors:'accepted',crossFamilyIndexedIota:'accepted',nestedRecursiveIndex:'rejected',nestedResultIndex:'rejected',serializedReplay:'accepted'},historicalIsolation:{v25MutualIndices:'rejected'},explicitGaps:{mutualProp:'unsupported',higherOrderMutualRecursion:'unsupported',nestedPreprocessing:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v26 mutual indices, per-family motives, cross-family indexed iota, mixed index counts, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
