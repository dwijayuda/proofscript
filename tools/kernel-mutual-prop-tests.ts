import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelParam,sameTerm} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualPropArtifact,makeKernelMutualHigherOrderArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=levelOfNat(0),L1=levelOfNat(1),U=levelParam('u');
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true};
const env28=()=>new Environment({...baseOpts,allowMutualProp:true});
const env27=()=>new Environment(baseOpts);
const R={kind:'axiom',name:'RMProp',levelParams:[],type:S(L0)},r={kind:'axiom',name:'rMProp',levelParams:[],type:C('RMProp')};
const N={kind:'axiom',name:'NMProp',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0MProp',levelParams:[],type:C('NMProp')};

const PQ={kind:'mutualInductive',name:'PQMutualProp',levelParams:[],inductives:[
  {name:'PMP',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PMP.left',type:C('PMP')},{name:'PMP.fromQ',type:Pi(C('QMP'),C('PMP'))}]},
  {name:'QMP',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'QMP.right',type:C('QMP')},{name:'QMP.fromP',type:Pi(C('PMP'),C('QMP'))}]},
]};

// Historical v27 explicitly rejects mutual Prop; v28 admits it atomically.
{
  const e=env27();assert.throws(()=>checkAndAddDeclaration(e,PQ),/mutual Prop families are outside this kernel profile/);
  assert.equal(e.has('PMP'),false);assert.equal(e.has('QMP'),false);
  const n=env28();checkAndAddDeclaration(n,PQ);assert.ok(n.has('PMP.rec')&&n.has('QMP.rec'));
  const pr=n.get('PMP.rec').declaration,qr=n.get('QMP.rec').declaration;
  assert.equal(pr.kind,'recursor');assert.equal(qr.kind,'recursor');
  assert.deepEqual(pr.levelParams,[]);assert.deepEqual(qr.levelParams,[],'mutual Prop recursors must not introduce a motive universe');
}

// Prop-valued motives compute across the other family; Type-valued motives reject.
{
  const e=env28();for(const d of [R,r,N,n0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,PQ);
  const motiveP=Lam(C('PMP'),C('RMProp')),motiveQ=Lam(C('QMP'),C('RMProp'));
  const minorLeft=C('rMProp');
  const minorFromQ=Lam(C('QMP'),Lam(C('RMProp'),C('rMProp')));
  const minorRight=C('rMProp');
  const minorFromP=Lam(C('PMP'),Lam(C('RMProp'),C('rMProp')));
  const major=App(C('PMP.fromQ'),C('QMP.right'));
  const rec=Apps(C('PMP.rec'),[motiveP,motiveQ,minorLeft,minorFromQ,minorRight,minorFromP,major]);
  assert.ok(sameTerm(kernelWhnf(e,rec),C('rMProp')),'mutual Prop cross-family iota must compute');
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],rec)),C('RMProp')));
  const bad=Apps(C('PMP.rec'),[Lam(C('PMP'),C('NMProp')),Lam(C('QMP'),C('NMProp')),C('n0MProp'),Lam(C('QMP'),Lam(C('NMProp'),C('n0MProp'))),C('n0MProp'),Lam(C('PMP'),Lam(C('NMProp'),C('n0MProp'))),C('PMP.left')]);
  assert.throws(()=>infer(e,[],bad),/type mismatch|expected|sort/i,'mutual predicates must not eliminate into Type');
}

// Empty mutual predicates are still Prop-only (unlike a single empty Prop).
const EmptyPQ={kind:'mutualInductive',name:'EmptyPQMutualProp',levelParams:[],inductives:[
  {name:'EMP',type:S(L0),numParams:0,numIndices:0,constructors:[]},
  {name:'EMQ',type:S(L0),numParams:0,numIndices:0,constructors:[]},
]};
{
  const e=env28();checkAndAddDeclaration(e,EmptyPQ);
  assert.deepEqual(e.get('EMP.rec').declaration.levelParams,[]);assert.deepEqual(e.get('EMQ.rec').declaration.levelParams,[]);
}

// Prop impredicativity permits data-valued fields, but the mutual recursor stays small.
const DataPQ={kind:'mutualInductive',name:'DataPQMutualProp',levelParams:[],inductives:[
  {name:'DMP',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'DMP.mk',type:Pi(C('NMProp'),Pi(C('DMQ'),C('DMP')))}]},
  {name:'DMQ',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'DMQ.mk',type:Pi(C('DMP'),C('DMQ'))}]},
]};
{
  const hDMQ={kind:'axiom',name:'hDMQMProp',levelParams:[],type:C('DMQ')};
  const e=env28();for(const d of [N,n0,R,r])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,DataPQ);checkAndAddDeclaration(e,hDMQ);
  assert.deepEqual(e.get('DMP.rec').declaration.levelParams,[]);
  assert.ok(e.has('DMP.mk')&&e.has('DMQ.mk'));
  const motiveD=Lam(C('DMP'),C('RMProp')),motiveQ=Lam(C('DMQ'),C('RMProp'));
  const minorD=Lam(C('NMProp'),Lam(C('DMQ'),Lam(C('RMProp'),C('rMProp'))));
  const minorQ=Lam(C('DMP'),Lam(C('RMProp'),C('rMProp')));
  const major=Apps(C('DMP.mk'),[C('n0MProp'),C('hDMQMProp')]);
  const rec=Apps(C('DMP.rec'),[motiveD,motiveQ,minorD,minorQ,major]);
  assert.ok(sameTerm(kernelWhnf(e,rec),C('rMProp')),'data-field mutual Prop iota must compute even when a recursive IH remains stuck');
}

// Shared universe parameters remain on mutual Prop recursors, but no motive universe is added.
const ParamPQ={kind:'mutualInductive',name:'ParamPQMutualProp',levelParams:['u'],inductives:[
  {name:'PParamMP',type:Pi(S({tag:'succ',of:U}),S(L0)),numParams:1,numIndices:0,constructors:[
    {name:'PParamMP.mk',type:Pi(S({tag:'succ',of:U}),Pi(B(0),Pi(App(C('QParamMP',[U]),B(1)),App(C('PParamMP',[U]),B(2)))))}]},
  {name:'QParamMP',type:Pi(S({tag:'succ',of:U}),S(L0)),numParams:1,numIndices:0,constructors:[
    {name:'QParamMP.mk',type:Pi(S({tag:'succ',of:U}),Pi(App(C('PParamMP',[U]),B(0)),App(C('QParamMP',[U]),B(1))))}]},
]};
{
  const e=env28();checkAndAddDeclaration(e,ParamPQ);
  assert.deepEqual(e.get('PParamMP.rec').declaration.levelParams,['u']);
  assert.deepEqual(e.get('QParamMP.rec').declaration.levelParams,['u']);
}

// Indexed + higher-order mutual Prop: pointwise IHs retain the target index while motives stay in Prop.
const IdxP={kind:'axiom',name:'IdxMProp',levelParams:[],type:S(L1)};
const i0P={kind:'axiom',name:'i0MProp',levelParams:[],type:C('IdxMProp')};
const DomP={kind:'axiom',name:'DomMProp',levelParams:[],type:Pi(C('IdxMProp'),S(L1))};
const pickP={kind:'axiom',name:'pickMProp',levelParams:[],type:Pi(C('IdxMProp'),App(C('DomMProp'),B(0)))};
const IndexedHO={kind:'mutualInductive',name:'IndexedHOMutualProp',levelParams:[],inductives:[
  {name:'IHPM',type:Pi(C('IdxMProp'),S(L0)),numParams:0,numIndices:1,constructors:[
    {name:'IHPM.base',type:App(C('IHPM'),C('i0MProp'))},
    {name:'IHPM.step',type:Pi(C('IdxMProp'),Pi(Pi(App(C('DomMProp'),B(0)),App(C('IHQM'),B(1))),App(C('IHPM'),B(1))))},
  ]},
  {name:'IHQM',type:Pi(C('IdxMProp'),S(L0)),numParams:0,numIndices:1,constructors:[
    {name:'IHQM.mk',type:Pi(C('IdxMProp'),Pi(App(C('IHPM'),B(0)),App(C('IHQM'),B(1))))},
  ]},
]};
{
  const e=env28();for(const d of [IdxP,i0P,DomP,pickP,R,r])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,IndexedHO);
  assert.deepEqual(e.get('IHPM.rec').declaration.levelParams,[]);assert.deepEqual(e.get('IHQM.rec').declaration.levelParams,[]);
  const idx=C('IdxMProp'),out=C('RMProp');
  const motiveP=Lam(idx,Lam(App(C('IHPM'),B(0)),out));
  const motiveQ=Lam(idx,Lam(App(C('IHQM'),B(0)),out));
  const minorBase=C('rMProp');
  const fTy=Pi(App(C('DomMProp'),B(0)),App(C('IHQM'),B(1)));
  const ihTy=Pi(App(C('DomMProp'),B(1)),C('RMProp'));
  const minorStep=Lam(idx,Lam(fTy,Lam(ihTy,App(B(0),App(C('pickMProp'),B(2))))));
  const minorQ=Lam(idx,Lam(App(C('IHPM'),B(0)),Lam(C('RMProp'),B(0))));
  const f=Lam(App(C('DomMProp'),C('i0MProp')),Apps(C('IHQM.mk'),[C('i0MProp'),C('IHPM.base')]));
  const major=Apps(C('IHPM.step'),[C('i0MProp'),f]);
  const rec=Apps(C('IHPM.rec'),[motiveP,motiveQ,minorBase,minorStep,minorQ,C('i0MProp'),major]);
  assert.ok(sameTerm(kernelWhnf(e,rec),C('rMProp')),'indexed higher-order mutual Prop pointwise IH/iota must compute');
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],rec)),C('RMProp')));
}

// Mutual K-like reduction is disabled. An arbitrary proof major remains stuck.
const KPQ={kind:'mutualInductive',name:'KPQMutualProp',levelParams:[],inductives:[
  {name:'KMP',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'KMP.intro',type:C('KMP')}]},
  {name:'KMQ',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'KMQ.intro',type:C('KMQ')}]},
]};
{
  const h={kind:'axiom',name:'hKMP',levelParams:[],type:C('KMP')};
  const e=env28();for(const d of [R,r])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,KPQ);checkAndAddDeclaration(e,h);
  const rec=Apps(C('KMP.rec'),[Lam(C('KMP'),C('RMProp')),Lam(C('KMQ'),C('RMProp')),C('rMProp'),C('rMProp'),C('hKMP')]);
  assert.ok(!sameTerm(kernelWhnf(e,rec),C('rMProp')),'Lean disables RecursorVal.k for mutual declarations');
}

// Kernel-level polymorphic result that may be zero gets the conservative Prop motive universe.
// Historical v27 accepted the same raw Core block but generated a fresh motive universe; v28 fixes that profile boundary.
const Poly={kind:'mutualInductive',name:'PolyMutualMaybeProp',levelParams:['u'],inductives:[
  {name:'PUM',type:S(U),numParams:0,numIndices:0,constructors:[{name:'PUM.mk',type:C('PUM',[U])}]},
  {name:'QUM',type:S(U),numParams:0,numIndices:0,constructors:[{name:'QUM.mk',type:C('QUM',[U])}]},
]};
{
  const e28=env28();checkAndAddDeclaration(e28,Poly);assert.deepEqual(e28.get('PUM.rec').declaration.levelParams,['u']);
  const e27=env27();checkAndAddDeclaration(e27,Poly);assert.equal(e27.get('PUM.rec').declaration.levelParams.length,1,'direct active-kernel environment uses conservative potential-Prop motive policy');
}

// Always-nonzero Type universes retain large elimination.
const TypePoly={kind:'mutualInductive',name:'TypePolyMutual',levelParams:['u'],inductives:[
  {name:'PTM',type:S({tag:'succ',of:U}),numParams:0,numIndices:0,constructors:[{name:'PTM.mk',type:C('PTM',[U])}]},
  {name:'QTM',type:S({tag:'succ',of:U}),numParams:0,numIndices:0,constructors:[{name:'QTM.mk',type:C('QTM',[U])}]},
]};
{
  const e=env28();checkAndAddDeclaration(e,TypePoly);const lp=e.get('PTM.rec').declaration.levelParams;assert.equal(lp.length,2);assert.equal(lp[1],'u');
}

// Serialization/replay and explicit v27 isolation.
{
  const declarations=[R,r,PQ];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-prop0').status,'accepted');
  const historicalProfile = checkCoreDeclarations(declarations,'KERNEL-mutual-higher-order0');assert.equal(historicalProfile.status,'unsupported');assert.match(historicalProfile.message ?? '',/mutual Prop families are outside this kernel profile/);
  const artifact=makeKernelMutualPropArtifact(declarations);assert.equal(artifact.formatVersion,28);assert.equal(artifact.implementationProfile,'KERNEL-mutual-prop0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:27}),/unsupported v27 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-higher-order0'}),/unsupported v28 implementation profile/);
  const historical=makeKernelMutualHigherOrderArtifact([R,r]);
  const smuggled=decodeArtifact({...historical,declarations,formatVersion:27,implementationProfile:'KERNEL-mutual-higher-order0'});const smuggledResult = checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile);assert.equal(smuggledResult.status,'unsupported');assert.match(smuggledResult.message ?? '',/mutual Prop families are outside this kernel profile/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-prop-v28-'));const file=path.join(dir,'v28.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));
  const replay=verifyFile(file,new Set(['RMProp','rMProp']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 source-level observations for the representable source slice.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-prop-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`mutual\n  inductive P : Prop where\n  | left : P\n  | fromQ : Q → P\n  inductive Q : Prop where\n  | right : Q\n  | fromP : P → Q\nend\n#print P.rec\n\nuniverse u\nmutual\n  inductive PT : Type u where\n  | mk : PT\n  inductive QT : Type u where\n  | mk : QT\nend\n#print PT.rec\n\nmutual\n  inductive EP : Prop\n  inductive EQ : Prop\nend\n#print EP.rec\n\nuniverse v\nmutual\n  inductive PP (α : Type v) : Prop where\n  | mk : α → QQ α → PP α\n  inductive QQ (α : Type v) : Prop where\n  | mk : PP α → QQ α\nend\n#print PP.rec\n\nmutual\n  inductive HP : Prop where\n  | base : HP\n  | step : (Nat → HQ) → HP\n  inductive HQ : Prop where\n  | mk : HP → HQ\nend\n#print HP.rec\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/P → Prop/);assert.match(gr.stdout,/PT\.rec\.\{u_1, u\}/);assert.match(gr.stdout,/EP → Prop/);assert.match(gr.stdout,/PP\.rec\.\{v\}/);assert.match(gr.stdout,/∀ \(a : ∀ \(a : Nat\), HQ\), \(∀ \(a_1 : Nat\), motive_2/);assert.match(gr.stdout,/motive_2/);
  const badLarge=path.join(dir,'BadLarge.lean');fs.writeFileSync(badLarge,`mutual\n  inductive P : Prop where\n  | left : P\n  inductive Q : Prop where\n  | right : Q\nend\nexample (p : P) : Nat := P.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) 0 0 p\n`);const bl=spawnSync(lean,[badLarge],{encoding:'utf8'});assert.notEqual(bl.status,0);assert.match(bl.stderr+bl.stdout,/expected to have type\s+Prop|type mismatch/i);
  const mixed=path.join(dir,'Mixed.lean');fs.writeFileSync(mixed,`mutual\n  inductive P : Prop where | mk : P\n  inductive T : Type where | mk : T\nend\n`);const mr=spawnSync(lean,[mixed],{encoding:'utf8'});assert.notEqual(mr.status,0);assert.match(mr.stderr+mr.stdout,/same type universe|differs from a preceding one/i);
  const maybe=path.join(dir,'MaybeProp.lean');fs.writeFileSync(maybe,`universe u\nmutual\n  inductive P : Sort u where | mk : P\n  inductive Q : Sort u where | mk : Q\nend\n`);const mp=spawnSync(lean,[maybe],{encoding:'utf8'});assert.notEqual(mp.status,0);assert.match(mp.stderr+mp.stdout,/may be `Prop` for some parameter values|universe polymorphic resulting type/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_PROP_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-prop0',coreFormat:28,status:'accepted',supportedSlice:'direct mutual Prop families plus conservative Prop-only recursors whenever the raw Core result universe is not provably nonzero',observations:{mutualPropAdmission:'accepted',propOnlyMotiveUniverse:'accepted',emptyMutualPropStillSmall:'accepted',dataFieldsInProp:'accepted',sharedUniverseParameters:'accepted',indexedHigherOrderMutualProp:'accepted',mutualKDisabled:'accepted',alwaysTypeLargeElimination:'accepted',serializedReplay:'accepted'},sourceFrontendObservation:{potentiallyPropSortParameter:'rejected by Lean source elaborator; trusted Core uses Lean kernel-style conservative Prop motive policy'},historicalIsolation:{v27ExplicitMutualProp:'rejected'},explicitGaps:{nestedPreprocessing:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v28 mutual Prop admission, shared Prop-only recursor universes, empty/data-field cases, mutual-K disablement, potential-Prop universe hardening, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
