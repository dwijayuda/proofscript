import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedMultipleSpecializationsArtifact,makeKernelNestedIndexExpressionsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1); const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true};
const env33=()=>new Environment({...base,allowNestedMultipleSpecializations:true}),env32=()=>new Environment(base);

const Nat={kind:'axiom',name:'NatNMS33',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroNMS33',levelParams:[],type:C('NatNMS33')};
const one={kind:'axiom',name:'oneNMS33',levelParams:[],type:C('NatNMS33')};
const succ={kind:'axiom',name:'succNMS33',levelParams:[],type:Pi(C('NatNMS33'),C('NatNMS33'))};
const Box={kind:'inductive',name:'BoxNMS33',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNMS33.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNMS33'),B(1))))}]};
const Wrap={kind:'inductive',name:'WrapNMS33',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'WrapNMS33.mk',type:Pi(S(L1),Pi(B(0),App(C('WrapNMS33'),B(1))))}]};

// Two different closed fixed specializations of the same container.
const TwoFixed={kind:'inductive',name:'TwoFixedNMS33',levelParams:[],type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'TwoFixedNMS33.leaf',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Apps(C('TwoFixedNMS33'),[B(1),B(0)])))},
  {name:'TwoFixedNMS33.f0',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('BoxNMS33'),Apps(C('TwoFixedNMS33'),[B(1),B(1)])),Apps(C('TwoFixedNMS33'),[B(2),B(1)]))))},
  {name:'TwoFixedNMS33.f1',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('BoxNMS33'),Apps(C('TwoFixedNMS33'),[B(1),App(C('succNMS33'),B(1))])),Apps(C('TwoFixedNMS33'),[B(2),B(1)]))))},
]};
{
  const e=env33();for(const d of [Nat,zero,one,succ,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,TwoFixed);
  assert.deepEqual(checked.generated,['TwoFixedNMS33.leaf','TwoFixedNMS33.f0','TwoFixedNMS33.f1','TwoFixedNMS33.rec','TwoFixedNMS33.rec_1','TwoFixedNMS33.rec_2']);
  const rec=e.get('TwoFixedNMS33.rec')?.declaration,h1=e.get('TwoFixedNMS33.rec_1')?.declaration,h2=e.get('TwoFixedNMS33.rec_2')?.declaration;
  assert.equal(rec?.kind,'recursor');assert.equal(h1?.kind,'recursor');assert.equal(h2?.kind,'recursor');
  assert.equal(rec.metadata.mutual?.motiveCount,3);assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.numIndices,1);assert.match(pretty(h1.type),/TwoFixedNMS33/);assert.match(pretty(h2.type),/succNMS33/);

  // Force f1 -> rec_2 -> outer rec -> leaf iota all the way to a concrete result.
  const R={kind:'axiom',name:'ResultNMS33',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'result0NMS33',levelParams:[],type:C('ResultNMS33')};for(const d of [R,r0])checkAndAddDeclaration(e,d);
  const p=C('zeroNMS33'),i=C('oneNMS33'),fp0=p,fp1=App(C('succNMS33'),p);
  const tree0=Apps(C('TwoFixedNMS33'),[p,fp0]),tree1=Apps(C('TwoFixedNMS33'),[p,fp1]);
  const box0=App(C('BoxNMS33'),tree0),box1=App(C('BoxNMS33'),tree1);
  const mT=Lam(C('NatNMS33'),Lam(Apps(C('TwoFixedNMS33'),[p,B(0)]),C('ResultNMS33'))),m0=Lam(box0,C('ResultNMS33')),m1=Lam(box1,C('ResultNMS33'));
  const leaf=Lam(C('NatNMS33'),C('result0NMS33'));
  const f0=Lam(C('NatNMS33'),Lam(box0,Lam(C('ResultNMS33'),B(0))));
  const f1=Lam(C('NatNMS33'),Lam(box1,Lam(C('ResultNMS33'),B(0))));
  const b0=Lam(tree0,Lam(C('ResultNMS33'),B(0))),b1=Lam(tree1,Lam(C('ResultNMS33'),B(0)));
  const leaf1=Apps(C('TwoFixedNMS33.leaf'),[p,fp1]);
  const major=Apps(C('TwoFixedNMS33.f1'),[p,i,Apps(C('BoxNMS33.mk'),[tree1,leaf1])]);
  const term=Apps(C('TwoFixedNMS33.rec',[L1]),[p,mT,m0,m1,leaf,f0,f1,b0,b1,i,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0NMS33')),`second-helper iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('ResultNMS33')));
}

// Two distinct nested containers in one indexless outer family.
const Distinct={kind:'inductive',name:'DistinctNMS33',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'DistinctNMS33.leaf',type:C('DistinctNMS33')},
  {name:'DistinctNMS33.b',type:Pi(App(C('BoxNMS33'),C('DistinctNMS33')),C('DistinctNMS33'))},
  {name:'DistinctNMS33.w',type:Pi(App(C('WrapNMS33'),C('DistinctNMS33')),C('DistinctNMS33'))},
]};
{
  const e=env33();for(const d of [Box,Wrap])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Distinct);
  assert.deepEqual(checked.generated,['DistinctNMS33.leaf','DistinctNMS33.b','DistinctNMS33.w','DistinctNMS33.rec','DistinctNMS33.rec_1','DistinctNMS33.rec_2']);
  const rec=e.get('DistinctNMS33.rec')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(rec.metadata.mutual?.motiveCount,3);assert.ok(e.has('DistinctNMS33.rec_1'));assert.ok(e.has('DistinctNMS33.rec_2'));
}

// Multiple captured-current containers share one promoted current-index prefix.
const Captured={kind:'inductive',name:'CapturedNMS33',levelParams:[],type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'CapturedNMS33.leaf',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Apps(C('CapturedNMS33'),[B(1),B(0)])))},
  {name:'CapturedNMS33.b',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('BoxNMS33'),Apps(C('CapturedNMS33'),[B(1),B(0)])),Apps(C('CapturedNMS33'),[B(2),B(1)]))))},
  {name:'CapturedNMS33.w',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('WrapNMS33'),Apps(C('CapturedNMS33'),[B(1),B(0)])),Apps(C('CapturedNMS33'),[B(2),B(1)]))))},
]};
{
  const e=env33();for(const d of [Nat,Box,Wrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Captured);const rec=e.get('CapturedNMS33.rec')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(rec.metadata.numParams,2);assert.equal(rec.metadata.numIndices,0);assert.equal(rec.metadata.mutual?.motiveCount,3);
}

// Lean rejects combining captured-current and closed fixed specializations.
const Mixed={kind:'inductive',name:'MixedNMS33',levelParams:[],type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'MixedNMS33.leaf',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Apps(C('MixedNMS33'),[B(1),B(0)])))},
  {name:'MixedNMS33.cap',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('BoxNMS33'),Apps(C('MixedNMS33'),[B(1),B(0)])),Apps(C('MixedNMS33'),[B(2),B(1)]))))},
  {name:'MixedNMS33.fix',type:Pi(C('NatNMS33'),Pi(C('NatNMS33'),Pi(App(C('BoxNMS33'),Apps(C('MixedNMS33'),[B(1),App(C('succNMS33'),B(1))])),Apps(C('MixedNMS33'),[B(2),B(1)]))))},
]};
{
  const e=env33();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Mixed),/mixed captured-current and closed fixed/i);assert.equal(e.has('MixedNMS33'),false);assert.equal(e.has('MixedNMS33.rec'),false);
}

// Historical v32 rejects both multiplicity forms.
{
  const e=env32();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,TwoFixed),/exactly one fixed outer-index expression|nested/i);
  const e2=env32();for(const d of [Box,Wrap])checkAndAddDeclaration(e2,d);assert.throws(()=>checkAndAddDeclaration(e2,Distinct),/exactly one nested container/i);
}

// Strict v33 serialization/replay and semantic-smuggling rejection through v32.
{
  const declarations=[Nat,zero,one,succ,Box,TwoFixed];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-multiple-specializations0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-index-expressions0'),/fixed outer-index expression|nested/i);
  const artifact=makeKernelNestedMultipleSpecializationsArtifact(declarations);assert.equal(artifact.formatVersion,33);assert.equal(artifact.implementationProfile,'KERNEL-nested-multiple-specializations0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:32}),/unsupported v32 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-index-expressions0'}),/unsupported v33 implementation profile/);
  const historical=makeKernelNestedIndexExpressionsArtifact([Nat,zero,one,succ,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/fixed outer-index expression|nested/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-multiple-v33-')),file=path.join(dir,'v33.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatNMS33','zeroNMS33','oneNMS33','succNMS33']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-multiple-v33-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Wrap (α : Type) : Type where\n| mk : α → Wrap α\n\ninductive TwoFixed (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → TwoFixed p i\n| f0 : (i : Nat) → Box (TwoFixed p p) → TwoFixed p i\n| f1 : (i : Nat) → Box (TwoFixed p (Nat.succ p)) → TwoFixed p i\n#print TwoFixed.rec\n#print TwoFixed.rec_1\n#print TwoFixed.rec_2\n\ninductive Distinct : Type where\n| leaf : Distinct\n| b : Box Distinct → Distinct\n| w : Wrap Distinct → Distinct\n#print Distinct.rec\n#print Distinct.rec_1\n#print Distinct.rec_2\n\ninductive Captured (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → Captured p i\n| b : (i : Nat) → Box (Captured p i) → Captured p i\n| w : (i : Nat) → Wrap (Captured p i) → Captured p i\n#print Captured.rec\n#print Captured.rec_1\n#print Captured.rec_2\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/TwoFixed\.rec_2/);assert.match(gr.stdout,/Box \(TwoFixed p p\.succ\)/);assert.match(gr.stdout,/Distinct\.rec_2/);assert.match(gr.stdout,/Wrap Distinct/);assert.match(gr.stdout,/Captured\.rec_2/);assert.match(gr.stdout,/number of parameters: 2/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Mixed (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → Mixed p i\n| cap : (i : Nat) → Box (Mixed p i) → Mixed p i\n| fix : (i : Nat) → Box (Mixed p (Nat.succ p)) → Mixed p i\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/nested inductive datatypes parameters cannot contain local variables/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_MULTIPLE_SPECIALIZATIONS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-multiple-specializations0',coreFormat:33,status:'accepted',supportedSlice:'multiple compatible one-level nested auxiliary families over v32 monomorphic one-parameter zero-index containers',observations:{twoFixedSpecializations:'accepted',distinctContainers:'accepted',multipleCapturedContainers:'accepted',secondHelperIota:'accepted',mixedCapturedClosed:'rejected',serializedReplay:'accepted'},historicalIsolation:{v32MultipleSpecializations:'rejected'},explicitGaps:{indexedContainer:'unsupported',polymorphicOuterOrContainer:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v33 nested multiple specializations: multiple fixed/container helpers, captured multi-container mode, second-helper iota, mixed-mode rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
