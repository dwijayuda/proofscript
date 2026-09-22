import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedIndicesArtifact,makeKernelNestedParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1); const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true};
const env31=()=>new Environment({...base,allowNestedIndices:true}),env30=()=>new Environment(base);

const Nat={kind:'axiom',name:'NatNI31',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroNI31',levelParams:[],type:C('NatNI31')};
const one={kind:'axiom',name:'oneNI31',levelParams:[],type:C('NatNI31')};
const succ={kind:'axiom',name:'succNI31',levelParams:[],type:Pi(C('NatNI31'),C('NatNI31'))};
const Box={kind:'inductive',name:'BoxNI31',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNI31.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNI31'),B(1))))}]};

const Same={kind:'inductive',name:'SameNI31',levelParams:[],type:Pi(S(L1),Pi(C('NatNI31'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'SameNI31.leaf',type:Pi(S(L1),Pi(C('NatNI31'),Apps(C('SameNI31'),[B(1),B(0)])))},
  {name:'SameNI31.node',type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('BoxNI31'),Apps(C('SameNI31'),[B(1),B(0)])),Apps(C('SameNI31'),[B(2),B(1)]))))},
]};

// Captured-index mode: the outer index becomes a shared fixed recursor parameter.
{
  const e=env31();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Same);
  assert.deepEqual(checked.generated,['SameNI31.leaf','SameNI31.node','SameNI31.rec','SameNI31.rec_1']);
  const rec=e.get('SameNI31.rec')?.declaration,helper=e.get('SameNI31.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');
  assert.equal(rec.metadata.numParams,2);assert.equal(rec.metadata.numIndices,0);assert.equal(helper.metadata.numParams,2);assert.equal(helper.metadata.numIndices,0);
  assert.match(pretty(rec.type),/SameNI31/);assert.match(pretty(rec.type),/BoxNI31/);
  const A={kind:'axiom',name:'ANI31',levelParams:[],type:S(L1)},N={kind:'axiom',name:'NNI31',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0NI31',levelParams:[],type:C('NNI31')};for(const d of [A,N,n0])checkAndAddDeclaration(e,d);
  const At=C('ANI31'),z=C('zeroNI31'),tree=Apps(C('SameNI31'),[At,z]),box=App(C('BoxNI31'),tree),mT=Lam(tree,C('NNI31')),mB=Lam(box,C('NNI31'));
  const leaf=C('n0NI31'),node=Lam(box,Lam(C('NNI31'),B(0))),boxMinor=Lam(tree,Lam(C('NNI31'),B(0)));
  const leafMajor=Apps(C('SameNI31.leaf'),[At,z]),major=Apps(C('SameNI31.node'),[At,z,Apps(C('BoxNI31.mk'),[tree,leafMajor])]);
  const term=Apps(C('SameNI31.rec',[L1]),[At,z,mT,mB,leaf,node,boxMinor,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n0NI31')),`captured-index nested iota mismatch: ${pretty(kernelWhnf(e,term))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('NNI31')));
}

// Dependent captured indices are promoted together and keep their telescope dependency.
const Idx={kind:'axiom',name:'IdxNI31',levelParams:[],type:Pi(C('NatNI31'),S(L1))};
const Dep={kind:'inductive',name:'DepNI31',levelParams:[],type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('IdxNI31'),B(0)),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'DepNI31.leaf',type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('IdxNI31'),B(0)),Apps(C('DepNI31'),[B(2),B(1),B(0)]))))},
  {name:'DepNI31.node',type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('IdxNI31'),B(0)),Pi(App(C('BoxNI31'),Apps(C('DepNI31'),[B(2),B(1),B(0)])),Apps(C('DepNI31'),[B(3),B(2),B(1)])))))},
]};
{
  const e=env31();for(const d of [Nat,Idx,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Dep);const rec=e.get('DepNI31.rec')?.declaration,helper=e.get('DepNI31.rec_1')?.declaration;
  assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');assert.equal(rec.metadata.numParams,3);assert.equal(rec.metadata.numIndices,0);assert.equal(helper.metadata.numParams,3);assert.equal(helper.metadata.numIndices,0);
}

// Closed-specialization mode: outer family remains indexed, helper is fixed at index zero.
const Fixed={kind:'inductive',name:'FixedNI31',levelParams:[],type:Pi(S(L1),Pi(C('NatNI31'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'FixedNI31.leaf',type:Pi(S(L1),Pi(C('NatNI31'),Apps(C('FixedNI31'),[B(1),B(0)])))},
  {name:'FixedNI31.node',type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('BoxNI31'),Apps(C('FixedNI31'),[B(1),C('zeroNI31')])),Apps(C('FixedNI31'),[B(2),B(1)]))))},
]};
{
  const e=env31();for(const d of [Nat,zero,one,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Fixed);
  const rec=e.get('FixedNI31.rec')?.declaration,helper=e.get('FixedNI31.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');
  assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.numIndices,1);assert.equal(helper.metadata.numParams,1);assert.equal(helper.metadata.numIndices,0);
  const A={kind:'axiom',name:'AFNI31',levelParams:[],type:S(L1)},N={kind:'axiom',name:'NFNI31',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0FNI31',levelParams:[],type:C('NFNI31')};for(const d of [A,N,n0])checkAndAddDeclaration(e,d);
  const At=C('AFNI31'),z=C('zeroNI31'),o=C('oneNI31'),tree0=Apps(C('FixedNI31'),[At,z]),box0=App(C('BoxNI31'),tree0);
  const mT=Lam(C('NatNI31'),Lam(Apps(C('FixedNI31'),[At,B(0)]),C('NFNI31'))),mB=Lam(box0,C('NFNI31'));
  const leaf=Lam(C('NatNI31'),C('n0FNI31')),node=Lam(C('NatNI31'),Lam(box0,Lam(C('NFNI31'),B(0)))),boxMinor=Lam(tree0,Lam(C('NFNI31'),B(0)));
  const leaf0=Apps(C('FixedNI31.leaf'),[At,z]),major=Apps(C('FixedNI31.node'),[At,o,Apps(C('BoxNI31.mk'),[tree0,leaf0])]);
  const term=Apps(C('FixedNI31.rec',[L1]),[At,mT,mB,leaf,node,boxMinor,o,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n0FNI31')),`fixed-index nested iota mismatch: ${pretty(kernelWhnf(e,term))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('NFNI31')));
}

// A local index transformed under the nested specialization is rejected atomically.
const Changed={kind:'inductive',name:'ChangedNI31',levelParams:[],type:Pi(S(L1),Pi(C('NatNI31'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'ChangedNI31.leaf',type:Pi(S(L1),Pi(C('NatNI31'),Apps(C('ChangedNI31'),[B(1),B(0)])))},
  {name:'ChangedNI31.step',type:Pi(S(L1),Pi(C('NatNI31'),Pi(App(C('BoxNI31'),Apps(C('ChangedNI31'),[B(1),App(C('succNI31'),B(0))])),Apps(C('ChangedNI31'),[B(2),B(1)]))))},
]};
{
  const e=env31();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Changed),/parameter|uniform|corresponding|fixed|nested/i);assert.equal(e.has('ChangedNI31'),false);assert.equal(e.has('ChangedNI31.rec'),false);assert.equal(e.has('ChangedNI31.rec_1'),false);
}

// Historical v30 keeps indexed nested semantics unavailable.
{
  const e=env30();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Same),/recursive occurrence|positive|nested|direct/i);assert.equal(e.has('SameNI31'),false);
}

// Strict v31 serialization/replay and historical v30 semantic isolation.
{
  const declarations=[Nat,zero,Box,Fixed];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-indices0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-parameters0'),/recursive occurrence|positive|nested|direct/i);
  const artifact=makeKernelNestedIndicesArtifact(declarations);assert.equal(artifact.formatVersion,31);assert.equal(artifact.implementationProfile,'KERNEL-nested-indices0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:30}),/unsupported v30 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-parameters0'}),/unsupported v31 implementation profile/);
  const historical=makeKernelNestedParametersArtifact([Nat,zero,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/recursive occurrence|positive|nested|direct/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-indices-v31-')),file=path.join(dir,'v31.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatNI31','zeroNI31']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 captured/fixed index behavior and changed-local-index rejection.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-indices-v31-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Same (α : Type) : Nat → Type where\n| leaf : (n : Nat) → Same α n\n| node : (n : Nat) → Box (Same α n) → Same α n\n#print Same.rec\n#print Same.rec_1\n\ninductive Fixed (α : Type) : Nat → Type where\n| leaf : (n : Nat) → Fixed α n\n| node : (n : Nat) → Box (Fixed α 0) → Fixed α n\n#print Fixed.rec\n#print Fixed.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/Same\.rec/);assert.match(gr.stdout,/number of parameters: 2/);assert.match(gr.stdout,/Fixed\.rec/);assert.match(gr.stdout,/number of indices: 1/);assert.match(gr.stdout,/Box \(Fixed α 0\)/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Changed (α : Type) : Nat → Type where\n| leaf : (n : Nat) → Changed α n\n| step : (n : Nat) → Box (Changed α (Nat.succ n)) → Changed α n\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/nested inductive datatypes parameters cannot contain local variables/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_INDICES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-indices0',coreFormat:31,status:'accepted',supportedSlice:'v30 bounded nested preprocessing extended with captured-fixed and closed fixed outer-index specializations',observations:{capturedOuterIndex:'accepted',dependentCapturedIndices:'accepted',closedFixedIndex:'accepted',indexedOuterIota:'accepted',changedLocalIndex:'rejected',serializedReplay:'accepted'},historicalIsolation:{v30IndexedNestedSemantics:'rejected'},explicitGaps:{parameterDependentClosedSpecialization:'unsupported',polymorphicOuterOrContainer:'unsupported',multipleNestedContainers:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v31 indexed nested preprocessing: captured/fixed index modes, dependent captured telescopes, linked indexed iota, rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
