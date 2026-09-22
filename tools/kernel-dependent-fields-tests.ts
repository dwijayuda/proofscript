import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {
  Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty
} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelDependentFieldsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L1=levelOfNat(1),L2=levelOfNat(2);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const env22=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true});
const env21=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true});
const N={kind:'axiom',name:'NDF',levelParams:[],type:S(L1)};
const n0={kind:'axiom',name:'n0DF',levelParams:[],type:C('NDF')};
const A={kind:'axiom',name:'ADF',levelParams:[],type:S(L1)};
const a={kind:'axiom',name:'aDF',levelParams:[],type:C('ADF')};

// Parameterless/indexless dependent telescope: (A : Type) -> A -> Pack.
const Pack={kind:'inductive',name:'PackDF',levelParams:[],type:S(L2),numParams:0,numIndices:0,constructors:[
  {name:'PackDF.mk',type:Pi(S(L1),Pi(B(0),C('PackDF')))}
]};
{
  const old=env21();assert.throws(()=>checkAndAddDeclaration(old,Pack),/depending on earlier constructor fields are unsupported/);
  const e=env22();checkAndAddDeclaration(e,Pack);
  const rec=e.get('PackDF.rec');assert.ok(rec);const text=pretty(rec.declaration.type);
  assert.match(text,/\(x1: Type\).*\(x2: x1\)/); // later minor binder depends on the earlier field

  checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,n0);checkAndAddDeclaration(e,A);checkAndAddDeclaration(e,a);
  const motive=Lam(C('PackDF'),C('NDF'));
  const minor=Lam(S(L1),Lam(B(0),C('n0DF')));
  const major=Apps(C('PackDF.mk'),[C('ADF'),C('aDF')]);
  const recApp=Apps(C('PackDF.rec',[L1]),[motive,minor,major]);
  assert.ok(sameTerm(kernelWhnf(e,recApp),C('n0DF')),`dependent-field iota mismatch: ${pretty(kernelWhnf(e,recApp))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],recApp)),C('NDF')));
}

// Multiple dependent fields: later proof field depends on both a predicate and
// an earlier value, exercising arbitrary constructor-local telescope depth.
const Chain={kind:'inductive',name:'ChainDF',levelParams:[],type:S(L2),numParams:0,numIndices:0,constructors:[
  {name:'ChainDF.mk',type:Pi(S(L1),Pi(B(0),Pi(Pi(B(1),S(levelOfNat(0))),Pi(App(B(0),B(1)),C('ChainDF')))))}
]};
{
  const e=env22();checkAndAddDeclaration(e,Chain);assert.ok(e.has('ChainDF.rec'));
}

// Higher-order strictly-positive recursive field whose Pi domain depends on an
// earlier constructor field: (A : Type) -> (A -> DTree) -> DTree.
const DTree={kind:'inductive',name:'DTreeDF',levelParams:[],type:S(L2),numParams:0,numIndices:0,constructors:[
  {name:'DTreeDF.leaf',type:C('DTreeDF')},
  {name:'DTreeDF.mk',type:Pi(S(L1),Pi(Pi(B(0),C('DTreeDF')),C('DTreeDF')))}
]};
{
  const old=env21();assert.throws(()=>checkAndAddDeclaration(old,DTree),/depending on earlier constructor fields are unsupported/);
  const e=env22();checkAndAddDeclaration(e,DTree);checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,n0);checkAndAddDeclaration(e,A);
  const f={kind:'axiom',name:'fDF',levelParams:[],type:Pi(C('ADF'),C('DTreeDF'))};checkAndAddDeclaration(e,f);
  const rec=e.get('DTreeDF.rec');assert.ok(rec);const rule=rec.declaration.metadata.rules.find(r=>r.ctor==='DTreeDF.mk');
  assert.deepEqual(rule?.recursiveFields,[false,true]);assert.ok(rule?.recursiveFieldTypes?.[1]);
  const motive=Lam(C('DTreeDF'),C('NDF'));
  const minorLeaf=C('n0DF');
  const minorMk=Lam(S(L1),Lam(Pi(B(0),C('DTreeDF')),Lam(Pi(B(1),C('NDF')),C('n0DF'))));
  const major=Apps(C('DTreeDF.mk'),[C('ADF'),C('fDF')]);
  const recApp=Apps(C('DTreeDF.rec',[L1]),[motive,minorLeaf,minorMk,major]);
  assert.ok(sameTerm(kernelWhnf(e,recApp),C('n0DF')),`dependent recursive iota mismatch: ${pretty(kernelWhnf(e,recApp))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],recApp)),C('NDF')));
}

// Indexed/parameterized dependent fields were already supported; v22 must keep
// that path unchanged while inheriting v21 universe admission.
const Ix={kind:'inductive',name:'IxDF',levelParams:[],type:Pi(C('NDF'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'IxDF.mk',type:Pi(C('NDF'),Pi(C('NDF'),App(C('IxDF'),B(0))))}
]};
{
  const e=env22();checkAndAddDeclaration(e,N);checkAndAddDeclaration(e,Ix);assert.ok(e.has('IxDF.rec'));
}

// v22 serialization/replay and strict profile isolation.
{
  const declarations=[N,n0,A,a,Pack,DTree];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-dependent-fields0').status,'accepted');
  assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-inductive-universes0'),/depending on earlier constructor fields are unsupported/);
  const artifact=makeKernelDependentFieldsArtifact(declarations);assert.equal(artifact.formatVersion,22);assert.equal(artifact.implementationProfile,'KERNEL-dependent-fields0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:21}),/unsupported v21 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-inductive-universes0'}),/unsupported v22 implementation profile/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-dep-fields-'));const file=path.join(dir,'d.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  assert.equal(verifyFile(file,new Set(['NDF','n0DF','ADF','aDF'])).status,'accepted');fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 admission + recursor/iota differential.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-dep-fields-lean-'));
  const good=path.join(dir,'DependentFields.lean');fs.writeFileSync(good,`inductive Pack : Type 1 where\n  | mk : (α : Type) → α → Pack\n\nexample (α : Type) (a : α) : Pack.rec (motive := fun _ => Nat) (fun _ _ => 7) (Pack.mk α a) = 7 := rfl\n\ninductive Chain : Type 1 where\n  | mk : (α : Type) → (a : α) → (P : α → Prop) → P a → Chain\n\ninductive DTree : Type 1 where\n  | leaf : DTree\n  | mk : (α : Type) → (α → DTree) → DTree\n\nexample : DTree.rec (motive := fun _ => Nat) 0 (fun _ _ _ => 7) (DTree.mk Nat (fun _ => DTree.leaf)) = 7 := rfl\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_DEPENDENT_FIELDS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-dependent-fields0',coreFormat:22,status:'accepted',observations:{simpleDependentFieldAdmission:'accepted',multiFieldDependency:'accepted',dependentRecursiveField:'accepted',simpleDependentIota:'accepted',dependentRecursiveIota:'accepted',indexedRegression:'accepted',serializedReplay:'accepted'},historicalIsolation:{v21SimpleDependentFieldAdmission:'rejected'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log(`✓ kernel v22 dependent simple constructor fields, dependent higher-order recursion, recursor/iota, indexed regression, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
