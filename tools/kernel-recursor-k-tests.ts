import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {
  Environment,checkAndAddDeclaration,checkCoreDeclarations,expectedEqType,expectedEqReflType,
  infer,kernelWhnf,levelOfNat,sameTerm
} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelRecursorKArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const D=(name,type,value)=>({kind:'definition',name,levelParams:[],type,value,reducibility:'regular'});
const env20=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true});
const env19=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:false});

const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)};
const n0={kind:'axiom',name:'n0',levelParams:[],type:C('N')};
const n1={kind:'axiom',name:'n1',levelParams:[],type:C('N')};
const Truth={kind:'inductive',name:'TruthK',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'TruthK.intro',type:C('TruthK')}]};
const exactEq=()=>({kind:'inductive',name:'Eq',levelParams:['u'],type:expectedEqType('u'),numParams:2,numIndices:1,constructors:[{name:'Eq.refl',type:expectedEqReflType('u')}]});
const constMotive=domain=>Lam(domain,C('N'));

// v20: arbitrary proof of a nullary singleton proposition reduces via K.
// v19: the identical major remains stuck, preserving the frozen historical semantics.
{
  const h={kind:'axiom',name:'ht',levelParams:[],type:C('TruthK')};
  const mkApp=()=>Apps(C('TruthK.rec',[L1]),[constMotive(C('TruthK')),C('n0'),C('ht')]);
  const e20=env20();for(const d of [N,n0,Truth,h])checkAndAddDeclaration(e20,d);
  assert.ok(sameTerm(kernelWhnf(e20,mkApp()),C('n0')));
  const e19=env19();for(const d of [N,n0,Truth,h])checkAndAddDeclaration(e19,d);
  assert.ok(!sameTerm(kernelWhnf(e19,mkApp()),C('n0')));
}

// Eq-like indexed K: arbitrary proof reduces only when the reconstructed refl
// constructor has a type definitionally equal to the major type.
{
  const h00={kind:'axiom',name:'h00',levelParams:[],type:Apps(C('Eq',[L1]),[C('N'),C('n0'),C('n0')])};
  const h01={kind:'axiom',name:'h01',levelParams:[],type:Apps(C('Eq',[L1]),[C('N'),C('n0'),C('n1')])};
  const alias={kind:'definition',name:'nAlias',levelParams:[],type:C('N'),value:C('n0'),reducibility:'regular'};
  const hAlias={kind:'axiom',name:'hAlias',levelParams:[],type:Apps(C('Eq',[L1]),[C('N'),C('n0'),C('nAlias')])};
  const env=env20();for(const d of [N,n0,n1,exactEq(),h00,h01,alias,hAlias])checkAndAddDeclaration(env,d);
  const motive=Lam(C('N'),Lam(Apps(C('Eq',[L1]),[C('N'),C('n0'),B(0)]),C('N')));
  const r00=Apps(C('Eq.rec',[L1,L1]),[C('N'),C('n0'),motive,C('n0'),C('n0'),C('h00')]);
  const r01=Apps(C('Eq.rec',[L1,L1]),[C('N'),C('n0'),motive,C('n0'),C('n1'),C('h01')]);
  const ra=Apps(C('Eq.rec',[L1,L1]),[C('N'),C('n0'),motive,C('n0'),C('nAlias'),C('hAlias')]);
  assert.ok(sameTerm(kernelWhnf(env,r00),C('n0')),'matching Eq endpoint must K-reduce');
  assert.ok(!sameTerm(kernelWhnf(env,r01),C('n0')),'incompatible Eq endpoint must remain stuck');
  assert.ok(sameTerm(kernelWhnf(env,ra),C('n0')),'definitionally equal Eq endpoint must K-reduce');
  assert.ok(sameTerm(kernelWhnf(env,infer(env,[],r00)),C('N')));
}

// A singleton proposition with fields is explicitly not RecursorVal.k.
{
  const P={kind:'axiom',name:'P',levelParams:[],type:S(L0)},Q={kind:'axiom',name:'Qp',levelParams:[],type:S(L0)};
  const AndK={kind:'inductive',name:'AndK',levelParams:[],type:Pi(S(L0),Pi(S(L0),S(L0))),numParams:2,numIndices:0,constructors:[
    {name:'AndK.intro',type:Pi(S(L0),Pi(S(L0),Pi(B(1),Pi(B(1),Apps(C('AndK'),[B(3),B(2)])))))}
  ]};
  const h={kind:'axiom',name:'hand',levelParams:[],type:Apps(C('AndK'),[C('P'),C('Qp')])};
  const env=env20();for(const d of [N,n0,P,Q,AndK,h])checkAndAddDeclaration(env,d);
  const family=Apps(C('AndK'),[C('P'),C('Qp')]);
  const motive=Lam(family,C('N'));const minor=Lam(C('P'),Lam(C('Qp'),C('n0')));
  const app=Apps(C('AndK.rec',[L1]),[C('P'),C('Qp'),motive,minor,C('hand')]);
  assert.ok(!sameTerm(kernelWhnf(env,app),C('n0')),'constructor fields must disable K-like reduction');
}

// Context-sensitive replay case: the major is a bound proof variable. v20 must
// reduce it under its local context; v19 must reject the same declaration.
{
  const QN={kind:'axiom',name:'QN',levelParams:[],type:Pi(C('N'),S(L1))};
  const q0={kind:'axiom',name:'q0',levelParams:[],type:App(C('QN'),C('n0'))};
  const motive=constMotive(C('TruthK'));
  const recOnBound=Apps(C('TruthK.rec',[L1]),[motive,C('n0'),B(0)]);
  const kDependent=D('kDependent',Pi(C('TruthK'),App(C('QN'),recOnBound)),Lam(C('TruthK'),C('q0')));
  const declarations=[N,n0,Truth,QN,q0,kDependent];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-recursor-k0').status,'accepted');
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-prop-elimination0').status,'rejected');

  const artifact=makeKernelRecursorKArtifact(declarations);
  assert.equal(artifact.formatVersion,20);assert.equal(artifact.implementationProfile,'KERNEL-recursor-k0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-rec-k-'));const file=path.join(dir,'k.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  assert.equal(verifyFile(file,new Set(['N','n0','QN','q0'])).status,'accepted');
  const old={...artifact,formatVersion:19,implementationProfile:'KERNEL-prop-elimination0'};const oldDecoded=decodeArtifact(old);
  assert.equal(checkCoreDeclarations(oldDecoded.declarations,oldDecoded.implementationProfile).status,'rejected');
  fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 differential for the K-specific behavior.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-rec-k-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive KP (α : Sort u) (a : α) : α → Prop where\n  | refl : KP α a a\naxiom ht : True\naxiom hk : KP Nat 0 0\ndef z : Nat := 0\ndef zAlias : Nat := z\naxiom hka : KP Nat z zAlias\nexample : True.rec (motive := fun _ => Nat) 7 ht = 7 := rfl\nexample : KP.rec (motive := fun _ _ => Nat) 7 hk = 7 := rfl\nexample : KP.rec (motive := fun _ _ => Nat) 7 hka = 7 := rfl\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const badIndex=path.join(dir,'BadIndex.lean');fs.writeFileSync(badIndex,`inductive KP (α : Sort u) (a : α) : α → Prop where\n  | refl : KP α a a\naxiom hk : KP Nat 0 1\nexample : KP.rec (motive := fun _ _ => Nat) 7 hk = 7 := rfl\n`);assert.notEqual(spawnSync(lean,[badIndex],{encoding:'utf8'}).status,0);
  const badFields=path.join(dir,'BadFields.lean');fs.writeFileSync(badFields,`axiom h : And True True\nexample : And.rec (motive := fun _ => Nat) (fun _ _ => 7) h = 7 := rfl\n`);assert.notEqual(spawnSync(lean,[badFields],{encoding:'utf8'}).status,0);
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log(`✓ kernel v20 Lean 4.33.1 RecursorVal.k classification, K-major reconstruction, context-sensitive reduction, replay, and historical gating passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
