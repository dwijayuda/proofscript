import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualHigherOrderArtifact,makeKernelMutualIndicesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true};
const env27=()=>new Environment({...baseOpts,allowHigherOrderMutualRecursion:true});
const env26=()=>new Environment(baseOpts);
const X={kind:'axiom',name:'XMH',levelParams:[],type:S(L1)};
const x0={kind:'axiom',name:'x0MH',levelParams:[],type:C('XMH')};
const Out={kind:'axiom',name:'OutMH',levelParams:[],type:S(L1)};
const out0={kind:'axiom',name:'out0MH',levelParams:[],type:C('OutMH')};
const HO={kind:'mutualInductive',name:'HOMutual',levelParams:[],inductives:[
  {name:'AHO',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'AHO.base',type:C('AHO')},
    {name:'AHO.mk',type:Pi(Pi(C('XMH'),C('BHO')),C('AHO'))},
  ]},
  {name:'BHO',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'BHO.mk',type:Pi(C('AHO'),C('BHO'))},
  ]},
]};
// v26 historical boundary.
{
  const e=env26();for(const d of [X,x0])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,HO),/mutual recursion must be a direct field|higher-order positivity is disabled|non-direct or negative higher-order recursive occurrence/);
  for(const m of HO.inductives){assert.equal(e.has(m.name),false);assert.equal(e.has(`${m.name}.rec`),false);}
}
// v27 pointwise cross-family IH must compute, not merely type-check.
{
  const e=env27();for(const d of [X,x0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,HO);
  const motiveA=Lam(C('AHO'),C('OutMH')),motiveB=Lam(C('BHO'),C('OutMH'));
  const fieldTy=Pi(C('XMH'),C('BHO'));
  const minorBase=C('out0MH');
  const minorAMk=Lam(fieldTy,Lam(Pi(C('XMH'),C('OutMH')),App(B(0),C('x0MH'))));
  const minorBMk=Lam(C('AHO'),Lam(C('OutMH'),B(0)));
  const f=Lam(C('XMH'),App(C('BHO.mk'),C('AHO.base')));
  const major=App(C('AHO.mk'),f);
  const rec=Apps(C('AHO.rec',[L1]),[motiveA,motiveB,minorBase,minorAMk,minorBMk,major]);
  const wh=kernelWhnf(e,rec);assert.ok(sameTerm(wh,C('out0MH')),`higher-order mutual iota mismatch: ${pretty(wh)}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],rec)),C('OutMH')));
}
// Indexed higher-order mutual recursion: the pointwise IH carries the target index.
const Idx={kind:'axiom',name:'IdxMH',levelParams:[],type:S(L1)};
const i0={kind:'axiom',name:'i0MH',levelParams:[],type:C('IdxMH')};
const Dom={kind:'axiom',name:'DomMH',levelParams:[],type:Pi(C('IdxMH'),S(L1))};
const pick={kind:'axiom',name:'pickMH',levelParams:[],type:Pi(C('IdxMH'),App(C('DomMH'),B(0)))};
const IHO={kind:'mutualInductive',name:'IHOMutual',levelParams:[],inductives:[
  {name:'IAHO',type:Pi(C('IdxMH'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'IAHO.base',type:App(C('IAHO'),C('i0MH'))},
    {name:'IAHO.step',type:Pi(C('IdxMH'),Pi(Pi(App(C('DomMH'),B(0)),App(C('IBHO'),B(1))),App(C('IAHO'),B(1))))},
  ]},
  {name:'IBHO',type:Pi(C('IdxMH'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'IBHO.mk',type:Pi(C('IdxMH'),Pi(App(C('IAHO'),B(0)),App(C('IBHO'),B(1))))},
  ]},
]};
{
  const e=env27();for(const d of [Idx,i0,Dom,pick,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,IHO);
  const idx=C('IdxMH'),out=C('OutMH');
  const motiveA=Lam(idx,Lam(App(C('IAHO'),B(0)),out));
  const motiveB=Lam(idx,Lam(App(C('IBHO'),B(0)),out));
  const minorBase=C('out0MH');
  const fTy=Pi(App(C('DomMH'),B(0)),App(C('IBHO'),B(1)));
  // n, f, ih. Apply ih to pick n.
  const ihTy=Pi(App(C('DomMH'),B(1)),C('OutMH'));
  const minorStep=Lam(idx,Lam(fTy,Lam(ihTy,App(B(0),App(C('pickMH'),B(2))))));
  const minorB=Lam(idx,Lam(App(C('IAHO'),B(0)),Lam(C('OutMH'),B(0))));
  const f=Lam(App(C('DomMH'),C('i0MH')),Apps(C('IBHO.mk'),[C('i0MH'),C('IAHO.base')]));
  const major=Apps(C('IAHO.step'),[C('i0MH'),f]);
  const rec=Apps(C('IAHO.rec',[L1]),[motiveA,motiveB,minorBase,minorStep,minorB,C('i0MH'),major]);
  const wh=kernelWhnf(e,rec);assert.ok(sameTerm(wh,C('out0MH')),`indexed higher-order mutual iota mismatch: ${pretty(wh)}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],rec)),C('OutMH')));
}
// Negative occurrence in a higher-order function domain must reject atomically.
const Bad={kind:'mutualInductive',name:'BadHOMutual',levelParams:[],inductives:[
  {name:'BadA',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadA.mk',type:Pi(Pi(C('BadB'),C('XMH')),C('BadA'))}]},
  {name:'BadB',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadB.mk',type:C('BadB')}]},
]};
{
  const e=env27();checkAndAddDeclaration(e,X);assert.throws(()=>checkAndAddDeclaration(e,Bad),/non-positive mutual occurrence in recursive function domain|negative recursive occurrence|contains negative recursive occurrence/);
  for(const m of Bad.inductives){assert.equal(e.has(m.name),false);assert.equal(e.has(`${m.name}.rec`),false);}
}
// Serialization/replay and historical isolation.
{
  const declarations=[X,x0,Out,out0,HO];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-higher-order0').status,'accepted');
  const historicalProfile = checkCoreDeclarations(declarations,'KERNEL-mutual-indices0');assert.equal(historicalProfile.status,'unsupported');assert.match(historicalProfile.message ?? '',/mutual recursion must be a direct field|higher-order positivity is disabled|non-direct or negative higher-order recursive occurrence/);
  const artifact=makeKernelMutualHigherOrderArtifact(declarations);assert.equal(artifact.formatVersion,27);assert.equal(artifact.implementationProfile,'KERNEL-mutual-higher-order0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:26}),/unsupported v26 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-indices0'}),/unsupported v27 implementation profile/);
  const historical=makeKernelMutualIndicesArtifact([X,x0,Out,out0]);
  const smuggled=decodeArtifact({...historical,declarations,formatVersion:26,implementationProfile:'KERNEL-mutual-indices0'});const smuggledResult = checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile);assert.equal(smuggledResult.status,'unsupported');assert.match(smuggledResult.message ?? '',/mutual recursion must be a direct field|higher-order positivity is disabled|non-direct or negative higher-order recursive occurrence/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-ho-v27-'));const file=path.join(dir,'v27.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['XMH','x0MH','OutMH','out0MH']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
// Exact Lean 4.33.1 observations.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-ho-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`mutual\n  inductive A : Type where\n  | base : A\n  | mk : (Nat → B) → A\n  inductive B : Type where\n  | mk : A → B\nend\nexample : A.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 (fun _ ih => ih 0) (fun _ ih => ih) (A.mk (fun _ => B.mk A.base)) = 0 := rfl\n#print A.rec\n\nmutual\n  inductive IA : Nat → Type where\n  | base : IA 0\n  | step {n : Nat} : (Fin n → IB n) → IA n\n  inductive IB : Nat → Type where\n  | mk {n : Nat} : IA n → IB n\nend\n#print IA.rec\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/\(a_1 : Nat\) → motive_2 \(a a_1\)/);assert.match(gr.stdout,/Fin n → IB n/);assert.match(gr.stdout,/motive_2 n/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`mutual\n  inductive NA : Type where\n  | mk : (NB → Nat) → NA\n  inductive NB : Type where\n  | mk : NB\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/positive|negative/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_HIGHER_ORDER_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-higher-order0',coreFormat:27,status:'accepted',supportedSlice:'direct mutual Type families with shared parameters/indices and strictly-positive Pi-codomain recursive fields',observations:{higherOrderMutualAdmission:'accepted',pointwiseCrossFamilyIH:'accepted',higherOrderCrossFamilyIota:'accepted',indexedHigherOrderMutual:'accepted',negativeFunctionDomain:'rejected',serializedReplay:'accepted'},historicalIsolation:{v26HigherOrderMutual:'rejected'},explicitGaps:{mutualProp:'unsupported',nestedPreprocessing:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v27 higher-order positive mutual recursion, pointwise cross-family IH/iota, indexed target indices, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
