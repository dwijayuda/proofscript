import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualParametersArtifact,makeKernelMutualInductivesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),L2=levelOfNat(2);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true};
const env25=()=>new Environment({...baseOpts,allowMutualParameters:true});
const env24=()=>new Environment(baseOpts);

const Alpha={kind:'axiom',name:'AlphaMP',levelParams:[],type:S(L1)};
const x0={kind:'axiom',name:'x0MP',levelParams:[],type:C('AlphaMP')};
const Out={kind:'axiom',name:'OutMP',levelParams:[],type:S(L1)};
const out0={kind:'axiom',name:'out0MP',levelParams:[],type:C('OutMP')};

// One shared uniform parameter, with a base constructor so both recursors can be reduced.
const ParamAB={kind:'mutualInductive',name:'ParamABMutual',levelParams:[],inductives:[
  {name:'PAMut',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'PAMut.base',type:Pi(S(L1),App(C('PAMut'),B(0)))},
    {name:'PAMut.fromB',type:Pi(S(L1),Pi(App(C('PBMut'),B(0)),App(C('PAMut'),B(1))))},
  ]},
  {name:'PBMut',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'PBMut.fromA',type:Pi(S(L1),Pi(App(C('PAMut'),B(0)),App(C('PBMut'),B(1))))},
  ]},
]};

// Historical v24 accepts mutual blocks but not shared parameters.
{
  const e=env24();assert.throws(()=>checkAndAddDeclaration(e,ParamAB),/v24 mutual slice requires numParams=0/);
  for(const m of ParamAB.inductives)assert.equal(e.has(m.name),false);
}

// v25 admits the block, generates parameter-aware mutual recursors, and computes cross-family iota.
{
  const e=env25();for(const d of [Alpha,Out,out0])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,ParamAB);
  for(const name of ['PAMut','PBMut','PAMut.base','PAMut.fromB','PBMut.fromA','PAMut.rec','PBMut.rec'])assert.ok(e.has(name),`missing ${name}`);
  assert.deepEqual(checked.generated,['PAMut','PAMut.base','PAMut.fromB','PAMut.rec','PBMut','PBMut.fromA','PBMut.rec']);
  const alpha=C('AlphaMP');
  const aTy=App(C('PAMut'),alpha),bTy=App(C('PBMut'),alpha);
  const motiveA=Lam(aTy,C('OutMP')),motiveB=Lam(bTy,C('OutMP'));
  const minorBase=C('out0MP');
  const minorFromB=Lam(bTy,Lam(C('OutMP'),C('out0MP')));
  const minorFromA=Lam(aTy,Lam(C('OutMP'),C('out0MP')));
  const abase=App(C('PAMut.base'),alpha);
  const bmajor=Apps(C('PBMut.fromA'),[alpha,abase]);
  const amajor=Apps(C('PAMut.fromB'),[alpha,bmajor]);
  const prefix=[alpha,motiveA,motiveB,minorBase,minorFromB,minorFromA];
  const arec=Apps(C('PAMut.rec',[L1]),[...prefix,amajor]);
  const brec=Apps(C('PBMut.rec',[L1]),[...prefix,bmajor]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('out0MP')),`parameterized A mutual iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
  assert.ok(sameTerm(kernelWhnf(e,brec),C('out0MP')),`parameterized B mutual iota mismatch: ${pretty(kernelWhnf(e,brec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],arec)),C('OutMP')));
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],brec)),C('OutMP')));
}

// Genuinely dependent shared parameters: (α : Type) (x : α).
const DepParamAB={kind:'mutualInductive',name:'DepParamABMutual',levelParams:[],inductives:[
  {name:'DPAMut',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
    {name:'DPAMut.base',type:Pi(S(L1),Pi(B(0),Apps(C('DPAMut'),[B(1),B(0)])))},
    {name:'DPAMut.fromB',type:Pi(S(L1),Pi(B(0),Pi(Apps(C('DPBMut'),[B(1),B(0)]),Apps(C('DPAMut'),[B(2),B(1)]))))},
  ]},
  {name:'DPBMut',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
    {name:'DPBMut.fromA',type:Pi(S(L1),Pi(B(0),Pi(Apps(C('DPAMut'),[B(1),B(0)]),Apps(C('DPBMut'),[B(2),B(1)]))))},
  ]},
]};
{
  const e=env25();for(const d of [Alpha,x0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,DepParamAB);
  const alpha=C('AlphaMP'),x=C('x0MP');
  const aTy=Apps(C('DPAMut'),[alpha,x]),bTy=Apps(C('DPBMut'),[alpha,x]);
  const motiveA=Lam(aTy,C('OutMP')),motiveB=Lam(bTy,C('OutMP'));
  const minorBase=C('out0MP');
  const minorFromB=Lam(bTy,Lam(C('OutMP'),C('out0MP')));
  const minorFromA=Lam(aTy,Lam(C('OutMP'),C('out0MP')));
  const abase=Apps(C('DPAMut.base'),[alpha,x]);
  const bmajor=Apps(C('DPBMut.fromA'),[alpha,x,abase]);
  const amajor=Apps(C('DPAMut.fromB'),[alpha,x,bmajor]);
  const prefix=[alpha,x,motiveA,motiveB,minorBase,minorFromB,minorFromA];
  const arec=Apps(C('DPAMut.rec',[L1]),[...prefix,amajor]);
  const brec=Apps(C('DPBMut.rec',[L1]),[...prefix,bmajor]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('out0MP')),`dependent-parameter A iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
  assert.ok(sameTerm(kernelWhnf(e,brec),C('out0MP')),`dependent-parameter B iota mismatch: ${pretty(kernelWhnf(e,brec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],arec)),C('OutMP')));
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],brec)),C('OutMP')));
}

// Negative admission cases. Every failure must be atomic.
const BadCount={kind:'mutualInductive',name:'BadCountMP',levelParams:[],inductives:[
  {name:'BCMA',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BCMA.mk',type:Pi(S(L1),App(C('BCMA'),B(0)))}]},
  {name:'BCMB',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BCMB.mk',type:C('BCMB')}]},
]};
const BadParamType={kind:'mutualInductive',name:'BadParamTypeMP',levelParams:[],inductives:[
  {name:'BPTA',type:Pi(S(L1),S(L2)),numParams:1,numIndices:0,constructors:[{name:'BPTA.mk',type:Pi(S(L1),App(C('BPTA'),B(0)))}]},
  {name:'BPTB',type:Pi(S(L2),S(L2)),numParams:1,numIndices:0,constructors:[{name:'BPTB.mk',type:Pi(S(L2),App(C('BPTB'),B(0)))}]},
]};
const BadCtorParam={kind:'mutualInductive',name:'BadCtorParamMP',levelParams:[],inductives:[
  {name:'BCPA',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BCPA.mk',type:Pi(C('AlphaMP'),App(C('BCPA'),C('AlphaMP')))}]},
  {name:'BCPB',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BCPB.mk',type:Pi(S(L1),App(C('BCPB'),B(0)))}]},
]};
const BadRecursiveParam={kind:'mutualInductive',name:'BadRecursiveParamMP',levelParams:[],inductives:[
  {name:'BRPA',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BRPA.mk',type:Pi(S(L1),Pi(App(C('BRPB'),C('AlphaMP')),App(C('BRPA'),B(1))))}]},
  {name:'BRPB',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BRPB.mk',type:Pi(S(L1),App(C('BRPB'),B(0)))}]},
]};
const BadResultParam={kind:'mutualInductive',name:'BadResultParamMP',levelParams:[],inductives:[
  {name:'BRSA',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BRSA.mk',type:Pi(S(L1),App(C('BRSA'),C('AlphaMP')))}]},
  {name:'BRSB',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BRSB.mk',type:Pi(S(L1),App(C('BRSB'),B(0)))}]},
]};
for(const [bad,re,needsAlpha] of [
  [BadCount,/same number of parameters/,false],
  [BadParamType,/not definitionally equal to the shared parameter telescope/,false],
  [BadCtorParam,/parameter 0 is not uniform|codomain parameter 0 is not the uniform/,true],
  [BadRecursiveParam,/recursive BRPB parameter 0 is not the corresponding uniform mutual parameter|non-uniform recursive parameter 0 of BRPB/,true],
  [BadResultParam,/constructor result parameter 0 is not the corresponding uniform mutual parameter|codomain parameter 0 is not the uniform/,true],
]){
  const e=env25();if(needsAlpha)checkAndAddDeclaration(e,Alpha);assert.throws(()=>checkAndAddDeclaration(e,bad),re);
  for(const m of bad.inductives){assert.equal(e.has(m.name),false);for(const c of m.constructors)assert.equal(e.has(c.name),false);assert.equal(e.has(`${m.name}.rec`),false);}
}

// Strict v25 serialization/replay and historical semantic-smuggling rejection.
{
  const declarations=[Alpha,Out,out0,ParamAB];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-parameters0').status,'accepted');
  const historicalProfile = checkCoreDeclarations(declarations,'KERNEL-mutual-inductives0');assert.equal(historicalProfile.status,'unsupported');assert.match(historicalProfile.message ?? '',/v24 mutual slice requires numParams=0/);
  const artifact=makeKernelMutualParametersArtifact(declarations);assert.equal(artifact.formatVersion,25);assert.equal(artifact.implementationProfile,'KERNEL-mutual-parameters0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:24}),/unsupported v24 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-inductives0'}),/unsupported v25 implementation profile/);
  const historical=makeKernelMutualInductivesArtifact([Alpha,Out,out0]);
  const smuggled=decodeArtifact({...historical,declarations,formatVersion:24,implementationProfile:'KERNEL-mutual-inductives0'});
  const smuggledResult = checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile);assert.equal(smuggledResult.status,'unsupported');assert.match(smuggledResult.message ?? '',/v24 mutual slice requires numParams=0/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-param-v25-'));const file=path.join(dir,'v25.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['AlphaMP','OutMP','out0MP']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 admission, recursor and fixed-parameter observations.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-param-lean-'));
  const good=path.join(dir,'Good.lean');
  fs.writeFileSync(good,`mutual\n  inductive PA (α : Type) : Type where\n  | base : PA α\n  | fromB : PB α → PA α\n  inductive PB (α : Type) : Type where\n  | fromA : PA α → PB α\nend\nexample (α : Type) : PA.rec (α := α) (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ _ => 1) (fun _ _ => 2) (PA.fromB (PB.fromA (PA.base (α := α)))) = 1 := rfl\nexample (α : Type) : PB.rec (α := α) (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ _ => 1) (fun _ _ => 2) (PB.fromA (PA.base (α := α))) = 2 := rfl\n\nmutual\n  inductive PDA (α : Type) (x : α) : Type where\n  | base : PDA α x\n  | fromB : PDB α x → PDA α x\n  inductive PDB (α : Type) (x : α) : Type where\n  | fromA : PDA α x → PDB α x\nend\nexample (α : Type) (x : α) : PDA.rec (α := α) (x := x) (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ _ => 1) (fun _ _ => 2) (PDA.fromB (PDB.fromA (PDA.base (α := α) (x := x)))) = 1 := rfl\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const badCount=path.join(dir,'BadCount.lean');fs.writeFileSync(badCount,`mutual\n  inductive CA (α : Type) : Type where | mk : CA α\n  inductive CB : Type where | mk : CB\nend\n`);const cr=spawnSync(lean,[badCount],{encoding:'utf8'});assert.notEqual(cr.status,0);assert.match(cr.stderr+cr.stdout,/same parameters|parameter/i);
  const badType=path.join(dir,'BadType.lean');fs.writeFileSync(badType,`mutual\n  inductive TA (α : Type) : Type 1 where | mk : TA α\n  inductive TB (α : Type 1) : Type 1 where | mk : TB α\nend\n`);const tr=spawnSync(lean,[badType],{encoding:'utf8'});assert.notEqual(tr.status,0);assert.match(tr.stderr+tr.stdout,/Parameter|expected/i);
  const badRec=path.join(dir,'BadRec.lean');fs.writeFileSync(badRec,`mutual\n  inductive RA (α : Type) : Type where | mk : RB Nat → RA α\n  inductive RB (α : Type) : Type where | mk : RA α → RB α\nend\n`);const rr=spawnSync(lean,[badRec],{encoding:'utf8'});assert.notEqual(rr.status,0);assert.match(rr.stderr+rr.stdout,/Mismatched inductive type parameter|fixed throughout|parameter/i);
  const badResult=path.join(dir,'BadResult.lean');fs.writeFileSync(badResult,`mutual\n  inductive SA (α : Type) : Type where | mk : SA Nat\n  inductive SB (α : Type) : Type where | mk : SB α\nend\n`);const sr=spawnSync(lean,[badResult],{encoding:'utf8'});assert.notEqual(sr.status,0);assert.match(sr.stderr+sr.stdout,/Mismatched inductive type parameter|fixed throughout|parameter/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-parameters0',coreFormat:25,status:'accepted',supportedSlice:'direct zero-index Type mutual families with shared uniform parameters',observations:{sharedParameterAdmission:'accepted',dependentSharedParameters:'accepted',parameterAwareMutualRecursors:'accepted',crossFamilyIota:'accepted',parameterCountMismatch:'rejected',parameterTypeMismatch:'rejected',recursiveParameterVariation:'rejected',resultParameterVariation:'rejected',serializedReplay:'accepted'},historicalIsolation:{v24ParameterizedMutualBlock:'rejected'},explicitGaps:{mutualProp:'unsupported',mutualIndices:'unsupported',higherOrderMutualRecursion:'unsupported',nestedPreprocessing:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v25 shared/dependent mutual parameters, parameter-aware recursors/iota, atomic rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
