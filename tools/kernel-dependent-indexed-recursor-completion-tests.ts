import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,kernelWhnf,pretty,sameTerm} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelDependentIndexedRecursorCompletionArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Let=(type,value,body)=>({tag:'let',type,value,body});
const exactEnv=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true});

const Nat={kind:'axiom',name:'Nat',levelParams:[],type:S(L1)};
const J={kind:'axiom',name:'J',levelParams:[],type:S(L1)};
const F={kind:'axiom',name:'F',levelParams:[],type:Pi(C('J'),S(L1))};
const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)};
const Alpha={kind:'axiom',name:'Alpha',levelParams:[],type:S(L1)};
const j0={kind:'axiom',name:'j0',levelParams:[],type:C('J')};
const x0={kind:'axiom',name:'x0',levelParams:[],type:App(C('F'),C('j0'))};

// Dependent index telescope: the second index type depends on the first.
// Recursive iota must reconstruct both indices exactly.
const DI={kind:'inductive',name:'DI',levelParams:[],type:Pi(S(L1),Pi(C('J'),Pi(App(C('F'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'DI.mk',type:Pi(S(L1),Pi(C('J'),Pi(App(C('F'),B(0)),Pi(Apps(C('DI'),[B(2),B(1),B(0)]),Apps(C('DI'),[B(3),B(2),B(1)])))))}
]};
{
  const env=exactEnv(); for(const d of [J,F,N,Alpha,j0,x0,DI])checkAndAddDeclaration(env,d);
  const rec=env.get('DI.rec'); assert.ok(rec); const t=pretty(rec.declaration.type);
  assert.match(t,/\{x2: J\}/); assert.match(t,/\{x3: F\(x2\)\}/); assert.match(t,/x1\(x2, x3, x4\)/);
  const di0=Apps(C('DI'),[C('Alpha'),C('j0'),C('x0')]);
  checkAndAddDeclaration(env,{kind:'axiom',name:'d0',levelParams:[],type:di0});
  const motive=Lam(C('J'),Lam(App(C('F'),B(0)),Lam(Apps(C('DI'),[C('Alpha'),B(1),B(0)]),C('N'))));
  const minor=Lam(C('J'),Lam(App(C('F'),B(0)),Lam(Apps(C('DI'),[C('Alpha'),B(1),B(0)]),Lam(C('N'),B(0)))));
  const major=Apps(C('DI.mk'),[C('Alpha'),C('j0'),C('x0'),C('d0')]);
  const recConst=C('DI.rec',[L1]);
  const app=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),C('x0'),major]);
  const expected=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),C('x0'),C('d0')]);
  assert.ok(sameTerm(kernelWhnf(env,app),expected),'dependent-index iota must reconstruct the recursive major indices');
}

// Higher-order recursive field whose pointwise recursive index is the inner
// dependent binder itself.
const DHO={kind:'inductive',name:'DHO',levelParams:[],type:Pi(S(L1),Pi(C('J'),Pi(App(C('F'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'DHO.mk',type:Pi(S(L1),Pi(C('J'),Pi(App(C('F'),B(0)),Pi(Pi(App(C('F'),B(1)),Apps(C('DHO'),[B(3),B(2),B(0)])),Apps(C('DHO'),[B(3),B(2),B(1)])))))}
]};
{
  const env=exactEnv(); for(const d of [J,F,N,Alpha,DHO])checkAndAddDeclaration(env,d);
  const rec=env.get('DHO.rec'); assert.ok(rec); const t=pretty(rec.declaration.type);
  assert.match(t,/\(x5: F\(x2\)\) → x1\(x2, x5, x4\(x5\)\)/,'pointwise IH must use the inner dependent index');
}

// Lean's singleton-Prop exception is intentionally syntactic at this stage of
// inductive processing. Direct exposure permits Sort u; beta/zeta wrappers do
// not. This prevents the rejected over-broad v49 "definitional exposure" idea.
const Direct={kind:'inductive',name:'Direct',levelParams:[],type:Pi(C('Nat'),S(L0)),numParams:0,numIndices:1,constructors:[
  {name:'Direct.mk',type:Pi(C('Nat'),App(C('Direct'),B(0)))}
]};
const LetIdx={kind:'inductive',name:'LetIdx',levelParams:[],type:Pi(C('Nat'),S(L0)),numParams:0,numIndices:1,constructors:[
  {name:'LetIdx.mk',type:Pi(C('Nat'),App(C('LetIdx'),Let(C('Nat'),B(0),B(0))))}
]};
const BetaIdx={kind:'inductive',name:'BetaIdx',levelParams:[],type:Pi(C('Nat'),S(L0)),numParams:0,numIndices:1,constructors:[
  {name:'BetaIdx.mk',type:Pi(C('Nat'),App(C('BetaIdx'),App(Lam(C('Nat'),B(0)),B(0))))}
]};
{
  const env=exactEnv(); for(const d of [Nat,Direct,LetIdx,BetaIdx])checkAndAddDeclaration(env,d);
  assert.equal(env.get('Direct.rec').declaration.levelParams.length,1,'directly exposed data field must permit large elimination');
  assert.equal(env.get('LetIdx.rec').declaration.levelParams.length,0,'zeta-equivalent index wrapper remains Prop-only in Lean 4.33.1');
  assert.equal(env.get('BetaIdx.rec').declaration.levelParams.length,0,'beta-equivalent index wrapper remains Prop-only in Lean 4.33.1');
}

// v49 is an assurance/profile boundary, not a new kernel theory rule: the same
// admitted declarations remain valid under v48, while v49 has an explicit
// artifact identity and strict replay.
{
  const declarations=[J,F,DI];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-dependent-indexed-recursor-completion0').status,'accepted');
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-recursor-family-binder-info0').status,'accepted');
  const artifact=makeKernelDependentIndexedRecursorCompletionArtifact(declarations);
  assert.equal(artifact.formatVersion,49); assert.equal(artifact.implementationProfile,'KERNEL-dependent-indexed-recursor-completion0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v49-rec-')); const file=path.join(dir,'v49.pscore.json'); fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['J','F'])); assert.equal(replay.status,'accepted'); assert.equal(replay.projectPluginsLoaded,false);
  const historical=decodeArtifact({...artifact,formatVersion:48,implementationProfile:'KERNEL-recursor-family-binder-info0'});
  assert.equal(checkCoreDeclarations(historical.declarations,historical.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:48}),/unsupported v48 implementation profile/);
  fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'}); assert.equal(ver.status,0); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v49-lean-')); const f=path.join(dir,'Audit.lean');
  fs.writeFileSync(f,`set_option pp.universes true\nset_option pp.explicit true\nset_option inductive.autoPromoteIndices false\naxiom J : Type\naxiom F : J → Type\ninductive DI (α : Type) : (j : J) → F j → Type where\n | mk : (j : J) → (x : F j) → DI α j x → DI α j x\n#print DI.rec\ninductive DHO (α : Type) : (j : J) → F j → Type where\n | mk : (j : J) → (x : F j) → ((y : F j) → DHO α j y) → DHO α j x\n#print DHO.rec\ninductive Direct : Nat → Prop where | mk (n : Nat) : Direct n\n#print Direct.rec\ninductive LetIdx : Nat → Prop where | mk (n : Nat) : LetIdx (let x := n; x)\n#print LetIdx.rec\ninductive BetaIdx : Nat → Prop where | mk (n : Nat) : BetaIdx ((fun x : Nat => x) n)\n#print BetaIdx.rec\n`);
  const r=spawnSync(lean,[f],{encoding:'utf8'}); assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/recursor DI\.rec\.\{u\}/); assert.match(r.stdout,/\{j : J\} → \{a : F j\}/);
  assert.match(r.stdout,/\(y : F j\) → motive j y \(a y\)/,'Lean higher-order dependent IH');
  assert.match(r.stdout,/recursor Direct\.rec\.\{u\}/,'direct index exposure must be universe-polymorphic');
  assert.match(r.stdout,/recursor LetIdx\.rec :/); assert.doesNotMatch(r.stdout,/recursor LetIdx\.rec\.\{u\}/);
  assert.match(r.stdout,/recursor BetaIdx\.rec :/); assert.doesNotMatch(r.stdout,/recursor BetaIdx\.rec\.\{u\}/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_DEPENDENT_INDEXED_RECURSOR_COMPLETION_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-dependent-indexed-recursor-completion0',coreFormat:49,status:'accepted',semanticDeltaFromV48:'none; assurance/conformance profile',observations:{dependentIndexTelescope:'accepted',dependentIndexIota:'accepted',higherOrderDependentIndexedIH:'accepted',directPropIndexExposureLargeElimination:'accepted',zetaWrappedPropIndexExposure:'Prop-only',betaWrappedPropIndexExposure:'Prop-only',serializedReplay:'accepted',historicalV48Semantics:'accepted'},nextSemanticMilestone:'KERNEL-mutual-nested-generalization0'},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v49 final non-mutual dependent/indexed recursor audit, linked iota, Prop exposure boundary, replay, v48 semantic preservation${lean?' and exact Lean 4.33.1 differential':' (exact Lean unavailable)'}`);
