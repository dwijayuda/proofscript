import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelPropEliminationArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const D=(name,type,value)=>({kind:'definition',name,levelParams:[],type,value,reducibility:'regular'});
const exactEnv=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true});

const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0',levelParams:[],type:C('N')};
const J={kind:'axiom',name:'J',levelParams:[],type:S(L1)},j0={kind:'axiom',name:'j0',levelParams:[],type:C('J')};
const Truth={kind:'inductive',name:'TruthP',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'TruthP.intro',type:C('TruthP')}]};
const Hidden={kind:'inductive',name:'HiddenP',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'HiddenP.intro',type:Pi(C('N'),C('HiddenP'))}]};
const Choice={kind:'inductive',name:'ChoiceP',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'ChoiceP.left',type:C('ChoiceP')},{name:'ChoiceP.right',type:C('ChoiceP')}]};
const Loop={kind:'inductive',name:'LoopP',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'LoopP.step',type:Pi(C('LoopP'),C('LoopP'))}]};

function rec(env,name){const e=env.get(`${name}.rec`);assert.ok(e,`${name}.rec missing`);assert.equal(e.declaration.kind,'recursor');return e.declaration;}
function typeMotive(prop){return Lam(prop,C('N'));}

// Empty Prop already has large elimination (v14 behavior) and remains unchanged.
{
  const Empty={kind:'inductive',name:'EmptyP',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[]};
  const env=exactEnv();checkAndAddDeclaration(env,Empty);assert.deepEqual(rec(env,'EmptyP').levelParams,['u_motive']);
}

// One constructor, zero fields: large elimination.
{
  const env=exactEnv();for(const d of [N,n0,Truth])checkAndAddDeclaration(env,d);
  assert.deepEqual(rec(env,'TruthP').levelParams,['u_motive']);
  const motive=typeMotive(C('TruthP')),major=C('TruthP.intro');
  const app=Apps(C('TruthP.rec',[L1]),[motive,C('n0'),major]);
  assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('N')));assert.ok(sameTerm(kernelWhnf(env,app),C('n0')));
}

// One constructor, hidden Type-valued field: motive is restricted to Prop.
{
  const env=exactEnv();for(const d of [N,n0,Hidden])checkAndAddDeclaration(env,d);
  assert.deepEqual(rec(env,'HiddenP').levelParams,[]);
  const motive=typeMotive(C('HiddenP')),minor=Lam(C('N'),C('n0'));
  assert.throws(()=>infer(env,[],Apps(C('HiddenP.rec'),[motive,minor,Apps(C('HiddenP.intro'),[C('n0')])])),/type mismatch/);
}

// Multiple constructors in Prop: Prop-only elimination.
{
  const env=exactEnv();for(const d of [N,Choice])checkAndAddDeclaration(env,d);
  assert.deepEqual(rec(env,'ChoiceP').levelParams,[]);
  assert.throws(()=>infer(env,[],Apps(C('ChoiceP.rec'),[typeMotive(C('ChoiceP')),C('n0'),C('n0'),C('ChoiceP.left')])),/type mismatch|unknown constant/);
}

// Proof-only fields are safe for large elimination. This And-like declaration
// has two proposition parameters and two proof fields.
{
  const P0={kind:'axiom',name:'P0',levelParams:[],type:S(L0)},p0={kind:'axiom',name:'p0',levelParams:[],type:C('P0')};
  const Q0={kind:'axiom',name:'Q0',levelParams:[],type:S(L0)},q0={kind:'axiom',name:'q0',levelParams:[],type:C('Q0')};
  const AndP={kind:'inductive',name:'AndP',levelParams:[],type:Pi(S(L0),Pi(S(L0),S(L0))),numParams:2,numIndices:0,constructors:[
    {name:'AndP.intro',type:Pi(S(L0),Pi(S(L0),Pi(B(1),Pi(B(1),Apps(C('AndP'),[B(3),B(2)])))))}
  ]};
  const env=exactEnv();for(const d of [N,n0,P0,p0,Q0,q0,AndP])checkAndAddDeclaration(env,d);
  assert.deepEqual(rec(env,'AndP').levelParams,['u_motive']);
  const family=Apps(C('AndP'),[C('P0'),C('Q0')]);const motive=Lam(family,C('N'));
  const minor=Lam(C('P0'),Lam(C('Q0'),C('n0')));const major=Apps(C('AndP.intro'),[C('P0'),C('Q0'),C('p0'),C('q0')]);
  const app=Apps(C('AndP.rec',[L1]),[C('P0'),C('Q0'),motive,minor,major]);
  assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('N')));assert.ok(sameTerm(kernelWhnf(env,app),C('n0')));
}

// Recursive proof fields themselves live in Prop, so the singleton may
// eliminate into Type. The recursive IH is still generated and checked.
{
  const env=exactEnv();for(const d of [N,n0,Loop])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,{kind:'axiom',name:'lp',levelParams:[],type:C('LoopP')});
  assert.deepEqual(rec(env,'LoopP').levelParams,['u_motive']);
  const motive=typeMotive(C('LoopP'));const minor=Lam(C('LoopP'),Lam(C('N'),C('n0')));const major=App(C('LoopP.step'),C('lp'));
  const app=Apps(C('LoopP.rec',[L1]),[motive,minor,major]);assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('N')));assert.ok(sameTerm(kernelWhnf(env,app),C('n0')));
}

// A Type-valued constructor field exposed directly as an index is public in
// the major type, so Lean permits large elimination.
{
  const Reveal={kind:'inductive',name:'RevealP',levelParams:[],type:Pi(C('J'),S(L0)),numParams:0,numIndices:1,constructors:[
    {name:'RevealP.intro',type:Pi(C('J'),App(C('RevealP'),B(0)))}
  ]};
  const env=exactEnv();for(const d of [N,n0,J,j0,Reveal])checkAndAddDeclaration(env,d);
  assert.deepEqual(rec(env,'RevealP').levelParams,['u_motive']);
  const motive=Lam(C('J'),Lam(App(C('RevealP'),B(0)),C('N')));const minor=Lam(C('J'),C('n0'));const major=App(C('RevealP.intro'),C('j0'));
  const app=Apps(C('RevealP.rec',[L1]),[motive,minor,C('j0'),major]);assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('N')));assert.ok(sameTerm(kernelWhnf(env,app),C('n0')));
}

// A parameter is excluded from the field test, but a hidden witness is not:
// Nonempty-like propositions remain Prop-only.
{
  const NonemptyP={kind:'inductive',name:'NonemptyP',levelParams:[],type:Pi(S(L1),S(L0)),numParams:1,numIndices:0,constructors:[
    {name:'NonemptyP.intro',type:Pi(S(L1),Pi(B(0),App(C('NonemptyP'),B(1))))}
  ]};
  const env=exactEnv();for(const d of [N,n0,NonemptyP])checkAndAddDeclaration(env,d);assert.deepEqual(rec(env,'NonemptyP').levelParams,[]);
}

// Dependent proof fields are allowed, while every data-valued field must be
// directly exposed in the result indices.
{
  const predJ=Pi(C('J'),S(L0));
  const PJ={kind:'axiom',name:'PJ',levelParams:[],type:predJ};
  const DepReveal={kind:'inductive',name:'DepRevealP',levelParams:[],type:Pi(predJ,Pi(C('J'),S(L0))),numParams:1,numIndices:1,constructors:[
    {name:'DepRevealP.intro',type:Pi(predJ,Pi(C('J'),Pi(App(B(1),B(0)),Apps(C('DepRevealP'),[B(2),B(1)]))))}
  ]};
  const env=exactEnv();for(const d of [J,PJ,DepReveal])checkAndAddDeclaration(env,d);assert.deepEqual(rec(env,'DepRevealP').levelParams,['u_motive']);

  const HiddenI={kind:'inductive',name:'HiddenIP',levelParams:[],type:Pi(C('J'),S(L0)),numParams:0,numIndices:1,constructors:[
    {name:'HiddenIP.intro',type:Pi(C('J'),Pi(C('N'),App(C('HiddenIP'),B(1))))}
  ]};
  const env2=exactEnv();for(const d of [J,N,HiddenI])checkAndAddDeclaration(env2,d);assert.deepEqual(rec(env2,'HiddenIP').levelParams,[]);
}

// v19 replay succeeds. Re-labeling the same artifact as v18 must not grant the
// new recursor semantics to the historical profile.
{
  const motive=typeMotive(C('TruthP'));
  const truthToN=D('truthToN',Pi(C('TruthP'),C('N')),Lam(C('TruthP'),Apps(C('TruthP.rec',[L1]),[motive,C('n0'),B(0)])));
  const artifact=makeKernelPropEliminationArtifact([N,n0,Truth,truthToN]);assert.equal(artifact.formatVersion,19);assert.equal(artifact.implementationProfile,'KERNEL-prop-elimination0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-prop-elim-'));const file=path.join(dir,'p.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));assert.equal(verifyFile(file,new Set(['N','n0'])).status,'accepted');
  const old={...artifact,formatVersion:18,implementationProfile:'KERNEL-indexed-projections0'};const oldDecoded=decodeArtifact(old);
  assert.throws(()=>checkCoreDeclarations(oldDecoded.declarations,oldDecoded.implementationProfile),/unknown constant: TruthP\.rec/);
  fs.rmSync(dir,{recursive:true,force:true});
}

// Optional exact Lean 4.33.1 source differential. Absence is a capability gap,
// never treated as a semantic rejection.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-prop-elim-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive TruthP : Prop where | intro\ninductive BothP (P Q : Prop) : Prop where | intro : P → Q → BothP P Q\ninductive RevealP : Nat → Prop where | intro (n : Nat) : RevealP n\ndef truthNat (h : TruthP) : Nat := by cases h; exact 0\ndef bothNat {P Q : Prop} (h : BothP P Q) : Nat := by cases h; exact 0\ndef revealNat {n : Nat} (h : RevealP n) : Nat := by cases h; exact 0\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const bad1=path.join(dir,'Hidden.lean');fs.writeFileSync(bad1,`inductive HiddenP : Prop where | intro (n : Nat)\ndef bad (h : HiddenP) : Nat := by cases h; exact 0\n`);assert.notEqual(spawnSync(lean,[bad1],{encoding:'utf8'}).status,0);
  const bad2=path.join(dir,'Choice.lean');fs.writeFileSync(bad2,`inductive ChoiceP : Prop where | left | right\ndef bad (h : ChoiceP) : Nat := by cases h <;> exact 0\n`);assert.notEqual(spawnSync(lean,[bad2],{encoding:'utf8'}).status,0);
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log(`✓ kernel v19 Lean-shaped Prop elimination classification, recursor universes, iota, replay, and historical gating passed${lean?' with exact Lean 4.33.1 differential':' (exact Lean binary unavailable: differential pending)'}`);
