import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelTelescopeTermsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),L2=levelOfNat(2);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Let=(type,value,body,nondep=false)=>({tag:'let',type,value,body,nondep});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true};
const env23=()=>new Environment({...baseOpts,allowTelescopeTerms:true});
const env22=()=>new Environment(baseOpts);
const N={kind:'axiom',name:'NTT',levelParams:[],type:S(L1)};
const n0={kind:'axiom',name:'n0TT',levelParams:[],type:C('NTT')};
const lamType=App(Lam(S(L1),B(0)),C('NTT'));
const letType=Let(S(L1),C('NTT'),B(0));

const LamBox={kind:'inductive',name:'LamBoxTT',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'LamBoxTT.mk',type:Pi(lamType,C('LamBoxTT'))}]};
const LetBox={kind:'inductive',name:'LetBoxTT',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'LetBoxTT.mk',type:Pi(letType,C('LetBoxTT'))}]};

// v23 admits existing trusted Lam/Let Core forms inside recursor telescope metadata;
// v22 keeps the historical generator rejection.
for(const [decl,pattern] of [[LamBox,/lambda in telescope metadata is unsupported/],[LetBox,/let in telescope metadata is unsupported/]]){
  const old=env22(); checkAndAddDeclaration(old,N); assert.throws(()=>checkAndAddDeclaration(old,decl),pattern);
  const e=env23(); checkAndAddDeclaration(e,N); checkAndAddDeclaration(e,n0); checkAndAddDeclaration(e,decl); assert.ok(e.has(`${decl.name}.rec`));
  const motive=Lam(C(decl.name),C('NTT')); const minor=Lam(decl===LamBox?lamType:letType,C('n0TT')); const major=App(C(`${decl.name}.mk`),C('n0TT'));
  const recApp=Apps(C(`${decl.name}.rec`,[L1]),[motive,minor,major]);
  assert.ok(sameTerm(kernelWhnf(e,recApp),C('n0TT')),`${decl.name} iota mismatch: ${pretty(kernelWhnf(e,recApp))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],recApp)),C('NTT')));
}

// Capture of an earlier constructor field through both a nested lambda
// application and a let value/body must survive Core -> named -> Core lowering.
const captureLam=App(Lam(S(L1),B(0)),B(0));                  // under α: (fun β => β) α
const captureLet=Let(S(L1),B(1),B(0));                      // under α,a: let β := α; β
const Capture={kind:'inductive',name:'CaptureTT',levelParams:[],type:S(L2),numParams:0,numIndices:0,constructors:[
  {name:'CaptureTT.mk',type:Pi(S(L1),Pi(captureLam,Pi(captureLet,C('CaptureTT'))))}
]};
{
  const e=env23(); checkAndAddDeclaration(e,N); checkAndAddDeclaration(e,n0); checkAndAddDeclaration(e,Capture);
  const motive=Lam(C('CaptureTT'),C('NTT'));
  const minor=Lam(S(L1),Lam(B(0),Lam(B(1),C('n0TT'))));
  const major=Apps(C('CaptureTT.mk'),[C('NTT'),C('n0TT'),C('n0TT')]);
  const recApp=Apps(C('CaptureTT.rec',[L1]),[motive,minor,major]);
  assert.ok(sameTerm(kernelWhnf(e,recApp),C('n0TT')));
}

// Higher-order recursive field: the recursive Pi domain itself contains Let.
const RTree={kind:'inductive',name:'RTreeTT',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'RTreeTT.leaf',type:C('RTreeTT')},
  {name:'RTreeTT.mk',type:Pi(Pi(letType,C('RTreeTT')),C('RTreeTT'))}
]};
{
  const old=env22(); checkAndAddDeclaration(old,N); assert.throws(()=>checkAndAddDeclaration(old,RTree),/let in telescope metadata is unsupported/);
  const e=env23(); checkAndAddDeclaration(e,N); checkAndAddDeclaration(e,n0); checkAndAddDeclaration(e,RTree);
  const f={kind:'axiom',name:'fTT',levelParams:[],type:Pi(C('NTT'),C('RTreeTT'))}; checkAndAddDeclaration(e,f);
  const motive=Lam(C('RTreeTT'),C('NTT')); const minorLeaf=C('n0TT');
  const minorMk=Lam(Pi(letType,C('RTreeTT')),Lam(Pi(letType,C('NTT')),C('n0TT')));
  const major=App(C('RTreeTT.mk'),C('fTT')); const recApp=Apps(C('RTreeTT.rec',[L1]),[motive,minorLeaf,minorMk,major]);
  assert.ok(sameTerm(kernelWhnf(e,recApp),C('n0TT')));
}

// Indexed no-field recursor result index contains Let + Lam.
const indexTerm=Let(C('NTT'),C('n0TT'),App(Lam(C('NTT'),B(0)),B(0)));
const Ix={kind:'inductive',name:'IxTT',levelParams:[],type:Pi(C('NTT'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'IxTT.mk',type:App(C('IxTT'),indexTerm)}
]};
{
  const old=env22(); checkAndAddDeclaration(old,N); checkAndAddDeclaration(old,n0); assert.throws(()=>checkAndAddDeclaration(old,Ix),/let in telescope metadata is unsupported|lambda in telescope metadata is unsupported/);
  const e=env23(); checkAndAddDeclaration(e,N); checkAndAddDeclaration(e,n0); checkAndAddDeclaration(e,Ix); assert.ok(e.has('IxTT.rec'));
}

// Empty indexed recursor telescope domain contains Let.
const EmptyIx={kind:'inductive',name:'EmptyIxTT',levelParams:[],type:Pi(letType,S(L1)),numParams:0,numIndices:1,constructors:[]};
{
  const old=env22(); checkAndAddDeclaration(old,N); assert.throws(()=>checkAndAddDeclaration(old,EmptyIx),/let in telescope metadata is unsupported/);
  const e=env23(); checkAndAddDeclaration(e,N); checkAndAddDeclaration(e,EmptyIx); assert.ok(e.has('EmptyIxTT.rec'));
}

// v23 serialization/replay and strict profile isolation.
{
  const declarations=[N,n0,LamBox,LetBox,Capture,RTree,Ix,EmptyIx];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-telescope-terms0').status,'accepted');
  assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-dependent-fields0'),/lambda in telescope metadata is unsupported|let in telescope metadata is unsupported/);
  const artifact=makeKernelTelescopeTermsArtifact(declarations); assert.equal(artifact.formatVersion,23); assert.equal(artifact.implementationProfile,'KERNEL-telescope-terms0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact))); assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:22}),/unsupported v22 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-dependent-fields0'}),/unsupported v23 implementation profile/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-telescope-terms-')); const file=path.join(dir,'v23.pscore.json'); fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['NTT','n0TT'])); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false); fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 source-level admission and iota observations.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'}); assert.equal(ver.status,0); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-telescope-terms-lean-')); const file=path.join(dir,'TelescopeTerms.lean');
  fs.writeFileSync(file,`inductive LamField : Type where\n  | mk : ((fun α : Type => α) Nat) → LamField\nexample : LamField.rec (motive := fun _ => Nat) (fun _ => 7) (LamField.mk 0) = 7 := rfl\n\ninductive LetField : Type where\n  | mk : (let α : Type := Nat; α) → LetField\nexample : LetField.rec (motive := fun _ => Nat) (fun _ => 7) (LetField.mk 0) = 7 := rfl\n\ninductive Capture : Type 1 where\n  | mk : (α : Type) → ((fun β : Type => β) α) → (let β : Type := α; β) → Capture\nexample (α : Type) (a b : α) : Capture.rec (motive := fun _ => Nat) (fun _ _ _ => 7) (Capture.mk α a b) = 7 := rfl\n\ninductive RTree : Type where\n  | leaf : RTree\n  | mk : ((let α : Type := Nat; α) → RTree) → RTree\nexample : RTree.rec (motive := fun _ => Nat) 0 (fun _ _ => 7) (RTree.mk (fun _ => RTree.leaf)) = 7 := rfl\n\ninductive Ix : Nat → Type where\n  | mk : Ix (let n := 0; (fun x : Nat => x) n)\nexample : Ix.rec (motive := fun _ _ => Nat) 7 Ix.mk = 7 := rfl\n`);
  const r=spawnSync(lean,[file],{encoding:'utf8'}); assert.equal(r.status,0,r.stderr||r.stdout);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_TELESCOPE_TERMS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-telescope-terms0',coreFormat:23,status:'accepted',observations:{lambdaField:'accepted',letField:'accepted',capturedOuterBinder:'accepted',recursivePiDomain:'accepted',indexedResultTerm:'accepted',iota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v22TelescopeTerms:'rejected'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v23 recursor telescope lambda/let terms, binder capture, recursive/indexed paths, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
