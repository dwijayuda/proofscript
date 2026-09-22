import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualInductivesArtifact,makeKernelTelescopeTermsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),L2=levelOfNat(2);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true};
const env24=()=>new Environment({...baseOpts,allowMutualInductives:true});
const env23=()=>new Environment(baseOpts);
const N={kind:'axiom',name:'NMut',levelParams:[],type:S(L1)};
const n0={kind:'axiom',name:'n0Mut',levelParams:[],type:C('NMut')};

const AB={kind:'mutualInductive',name:'ABMutual',levelParams:[],inductives:[
  {name:'AMut',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'AMut.base',type:C('AMut')},
    {name:'AMut.fromB',type:Pi(C('BMut'),C('AMut'))},
  ]},
  {name:'BMut',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'BMut.fromA',type:Pi(C('AMut'),C('BMut'))},
  ]},
]};

// Historical v23 profile has no mutual-block semantics.
{
  const e=env23();checkAndAddDeclaration(e,N);assert.throws(()=>checkAndAddDeclaration(e,AB),/mutual inductives unavailable/);
}

// Atomic admission and generation of both recursors.
{
  const e=env24();checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,n0);const checked=checkAndAddDeclaration(e,AB);
  for(const name of ['AMut','BMut','AMut.base','AMut.fromB','BMut.fromA','AMut.rec','BMut.rec'])assert.ok(e.has(name),`missing ${name}`);
  assert.deepEqual(checked.generated,['AMut','AMut.base','AMut.fromB','AMut.rec','BMut','BMut.fromA','BMut.rec']);
  const motiveA=Lam(C('AMut'),C('NMut')),motiveB=Lam(C('BMut'),C('NMut'));
  const minorBase=C('n0Mut');
  const minorFromB=Lam(C('BMut'),Lam(C('NMut'),C('n0Mut')));
  const minorFromA=Lam(C('AMut'),Lam(C('NMut'),C('n0Mut')));
  const abase=C('AMut.base');
  const bmajor=App(C('BMut.fromA'),abase);
  const amajor=App(C('AMut.fromB'),bmajor);
  const prefix=[motiveA,motiveB,minorBase,minorFromB,minorFromA];
  const arec=Apps(C('AMut.rec',[L1]),[...prefix,amajor]);
  const brec=Apps(C('BMut.rec',[L1]),[...prefix,bmajor]);
  assert.ok(sameTerm(kernelWhnf(e,arec),C('n0Mut')),`A mutual iota mismatch: ${pretty(kernelWhnf(e,arec))}`);
  assert.ok(sameTerm(kernelWhnf(e,brec),C('n0Mut')),`B mutual iota mismatch: ${pretty(kernelWhnf(e,brec))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],arec)),C('NMut')));
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],brec)),C('NMut')));
}

// Nonrecursive dependent fields are preserved inside a mutual member.
const DepMut={kind:'mutualInductive',name:'DepMutual',levelParams:[],inductives:[
  {name:'DMut',type:S(L2),numParams:0,numIndices:0,constructors:[{name:'DMut.mk',type:Pi(S(L1),Pi(B(0),Pi(C('EMut'),C('DMut'))))}]},
  {name:'EMut',type:S(L2),numParams:0,numIndices:0,constructors:[{name:'EMut.mk',type:Pi(C('DMut'),C('EMut'))}]},
]};
{
  const e=env24();checkAndAddDeclaration(e,DepMut);assert.ok(e.has('DMut.rec'));assert.ok(e.has('EMut.rec'));
}

// Fail closed on universe mismatch and non-direct/negative mutual occurrences; admission is atomic.
const BadUniverse={kind:'mutualInductive',name:'BadUMutual',levelParams:[],inductives:[
  {name:'BadUA',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadUA.mk',type:C('BadUA')}]},
  {name:'BadUB',type:S(L2),numParams:0,numIndices:0,constructors:[{name:'BadUB.mk',type:C('BadUB')}]},
]};
const BadNegative={kind:'mutualInductive',name:'BadNMutual',levelParams:[],inductives:[
  {name:'BadNA',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadNA.mk',type:Pi(Pi(C('BadNB'),C('NMut')),C('BadNA'))}]},
  {name:'BadNB',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadNB.mk',type:C('BadNB')}]},
]};
for(const [bad,re] of [[BadUniverse,/same universe/],[BadNegative,/direct field|non-positive mutual occurrence|negative recursive occurrence/]]){
  const e=env24();checkAndAddDeclaration(e,N);assert.throws(()=>checkAndAddDeclaration(e,bad),re);
  for(const m of bad.inductives){assert.equal(e.has(m.name),false);for(const c of m.constructors)assert.equal(e.has(c.name),false);assert.equal(e.has(`${m.name}.rec`),false);}
}

// Mutual Prop and parameter/index families stay explicit capability gaps in v24.
const PropMut={kind:'mutualInductive',name:'PropMutual',levelParams:[],inductives:[
  {name:'PMA',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PMA.mk',type:Pi(C('PMB'),C('PMA'))}]},
  {name:'PMB',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PMB.mk',type:Pi(C('PMA'),C('PMB'))}]},
]};
assert.throws(()=>checkAndAddDeclaration(env24(),PropMut),/mutual Prop families are outside/);

// Strict v24 serialization/replay and historical semantic-smuggling rejection.
{
  const declarations=[N,n0,AB];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-inductives0').status,'accepted');
  const historicalProfile = checkCoreDeclarations(declarations,'KERNEL-telescope-terms0');assert.equal(historicalProfile.status,'unsupported');assert.match(historicalProfile.message ?? '',/mutual inductives unavailable/);
  const artifact=makeKernelMutualInductivesArtifact(declarations);assert.equal(artifact.formatVersion,24);assert.equal(artifact.implementationProfile,'KERNEL-mutual-inductives0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:23}),/unsupported v23 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-telescope-terms0'}),/unsupported v24 implementation profile/);
  const historical=makeKernelTelescopeTermsArtifact([N,n0]);
  assert.throws(()=>decodeArtifact({...historical,declarations,formatVersion:23,implementationProfile:'KERNEL-telescope-terms0'}),/kind invalid/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-v24-'));const file=path.join(dir,'v24.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['NMut','n0Mut']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 admission, recursor and iota observations for the supported slice.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-lean-'));const good=path.join(dir,'Good.lean');
  fs.writeFileSync(good,`mutual\n  inductive MA : Type where\n  | base : MA\n  | fromB : MB → MA\n  inductive MB : Type where\n  | fromA : MA → MB\nend\nexample : MA.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ _ => 1) (fun _ _ => 2) (MA.fromB (MB.fromA MA.base)) = 1 := rfl\nexample : MB.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ _ => 1) (fun _ _ => 2) (MB.fromA MA.base) = 2 := rfl\n\nmutual\n  inductive MD : Type 1 where\n  | mk : (α : Type) → α → ME → MD\n  inductive ME : Type 1 where\n  | mk : MD → ME\nend\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const badU=path.join(dir,'BadU.lean');fs.writeFileSync(badU,`mutual\n  inductive UA : Type where | mk : UA\n  inductive UB : Type 1 where | mk : UB\nend\n`);const ur=spawnSync(lean,[badU],{encoding:'utf8'});assert.notEqual(ur.status,0);assert.match(ur.stderr+ur.stdout,/same universe|mutually inductive/i);
  const badN=path.join(dir,'BadN.lean');fs.writeFileSync(badN,`mutual\n  inductive NA : Type where | mk : (NB → Nat) → NA\n  inductive NB : Type where | mk : NB\nend\n`);const nr=spawnSync(lean,[badN],{encoding:'utf8'});assert.notEqual(nr.status,0);assert.match(nr.stderr+nr.stdout,/positive|positivity|invalid/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_INDUCTIVES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-inductives0',coreFormat:24,status:'accepted',supportedSlice:'direct zero-parameter/index Type mutual families',observations:{directMutualAdmission:'accepted',mutualRecursors:'accepted',crossFamilyIota:'accepted',dependentNonrecursiveFields:'accepted',universeMismatch:'rejected',negativeOccurrence:'rejected',serializedReplay:'accepted'},historicalIsolation:{v23MutualBlock:'rejected'},explicitGaps:{mutualProp:'unsupported',parametersIndices:'unsupported',higherOrderMutualRecursion:'unsupported',nestedPreprocessing:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v24 bounded direct mutual inductives, mutual recursors/iota, atomic rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
