import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,levelMax,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperPolymorphicArtifact,makeKernelMutualNestedDeeperIndicesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),Z=levelOfNat(0),U={tag:'param',name:'u'},Alev={tag:'param',name:'a'},Blev={tag:'param',name:'b'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true};
const env58=()=>new Environment(base),env59=()=>new Environment({...base,allowMutualNestedDeeperPolymorphic:true});

const Nat={kind:'axiom',name:'NatMN59',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroMN59',levelParams:[],type:C('NatMN59')};
const Box={kind:'inductive',name:'BoxMN59',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'BoxMN59.mk',type:Pi(TU,Pi(B(0),App(C('BoxMN59',[U]),B(1))))}]};
const Deep={kind:'mutualInductive',name:'DeepPolyIdxMN59',levelParams:['u'],inductives:[
 {name:'AMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[
  {name:'AMN59.leaf',type:App(C('AMN59',[U]),C('zeroMN59'))},
  {name:'AMN59.step',type:Pi(C('NatMN59'),Pi(App(C('BoxMN59',[U]),App(C('BoxMN59',[U]),App(C('BMN59',[U]),C('zeroMN59')))),App(C('AMN59',[U]),B(1))))},
 ]},
 {name:'BMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[
  {name:'BMN59.back',type:Pi(C('NatMN59'),Pi(App(C('AMN59',[U]),B(0)),App(C('BMN59',[U]),B(1))))},
 ]},
]};

// Polymorphic deep indexed graph: original indices retained; two helpers carry {motive,u} levels.
{
 const old=env58();for(const d of [Nat,zero,Box])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Deep),/positive mutual occurrence|mutual recursion|nested|polymorphic|constructor field|positive/i);
 const e=env59();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Deep);
 for(const n of ['AMN59.rec','BMN59.rec','AMN59.rec_1','AMN59.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN59.rec_3'),false);
 const ar=e.get('AMN59.rec').declaration,h1=e.get('AMN59.rec_1').declaration,h2=e.get('AMN59.rec_2').declaration;
 for(const r of [ar,h1,h2]){assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams.slice(1),['u']);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);}
 assert.equal(ar.metadata.numIndices,1);assert.equal(h1.metadata.numIndices,0);assert.equal(h2.metadata.numIndices,0);
 assert.match(pretty(ar.type),/BoxMN59\.\{u\}\(BoxMN59\.\{u\}\(BMN59\.\{u\}\(zeroMN59\)\)\)/);
 assert.deepEqual(checked.generated,['AMN59.leaf','AMN59.step','BMN59.back','AMN59.rec','BMN59.rec','AMN59.rec_1','AMN59.rec_2']);
}

// Actual linked iota A.step 0 -> helper1 -> helper2 -> B.back 0 -> A.leaf at u:=0.
{
 const Out={kind:'axiom',name:'OutMN59',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MN59',levelParams:[],type:C('OutMN59')};
 const e=env59();for(const d of [Nat,zero,Box,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Deep);
 const n=C('NatMN59'),z=C('zeroMN59'),a0=App(C('AMN59',[Z]),z),b0=App(C('BMN59',[Z]),z),boxB=App(C('BoxMN59',[Z]),b0),boxboxB=App(C('BoxMN59',[Z]),boxB),out=C('OutMN59');
 const args=[
  Lam(n,Lam(App(C('AMN59',[Z]),B(0)),out)),
  Lam(n,Lam(App(C('BMN59',[Z]),B(0)),out)),
  Lam(boxboxB,out),Lam(boxB,out),
  C('out0MN59'),
  Lam(n,Lam(boxboxB,Lam(out,B(0)))),
  Lam(n,Lam(App(C('AMN59',[Z]),B(0)),Lam(out,B(0)))),
  Lam(boxB,Lam(out,B(0))),
  Lam(b0,Lam(out,B(0))),
 ];
 const major=Apps(C('AMN59.step',[Z]),[z,Apps(C('BoxMN59.mk',[Z]),[boxB,Apps(C('BoxMN59.mk',[Z]),[b0,Apps(C('BMN59.back',[Z]),[z,C('AMN59.leaf',[Z])])])])]);
 const term=Apps(C('AMN59.rec',[L1,Z]),[...args,z,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0MN59')),`v59 linked polymorphic indexed iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Shared parameter-derived fixed target index composes with universe polymorphism and varying direct recursive indices.
{
 const P={kind:'mutualInductive',name:'ParamPolyIdxMN59',levelParams:['u'],inductives:[
  {name:'PAMN59',type:Pi(C('NatMN59'),Pi(C('NatMN59'),TU)),numParams:1,numIndices:1,constructors:[{name:'PAMN59.step',type:Pi(C('NatMN59'),Pi(C('NatMN59'),Pi(App(C('BoxMN59',[U]),App(C('BoxMN59',[U]),Apps(C('PBMN59',[U]),[B(1),B(1)]))),Apps(C('PAMN59',[U]),[B(2),B(1)]))))}]},
  {name:'PBMN59',type:Pi(C('NatMN59'),Pi(C('NatMN59'),TU)),numParams:1,numIndices:1,constructors:[{name:'PBMN59.back',type:Pi(C('NatMN59'),Pi(C('NatMN59'),Pi(Apps(C('PAMN59',[U]),[B(1),B(0)]),Apps(C('PBMN59',[U]),[B(2),B(1)]))))}]},
 ]};
 const e=env59();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,P);const r=e.get('PAMN59.rec').declaration;assert.deepEqual(r.levelParams.slice(1),['u']);assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);
}

// Explicit multi-universe container levels survive through both deep layers.
const LiftBox={kind:'inductive',name:'LiftBoxMN59',levelParams:['a','b'],type:Pi(S(levelSucc(Alev)),S(levelSucc(levelMax(Alev,Blev)))),numParams:1,numIndices:0,constructors:[{name:'LiftBoxMN59.mk',type:Pi(S(levelSucc(Alev)),Pi(B(0),App(C('LiftBoxMN59',[Alev,Blev]),B(1))))}]};
{
 const L={kind:'mutualInductive',name:'LiftDeepMN59',levelParams:['u'],inductives:[
  {name:'LAMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[{name:'LAMN59.step',type:Pi(C('NatMN59'),Pi(App(C('LiftBoxMN59',[U,Z]),App(C('LiftBoxMN59',[U,Z]),App(C('LBMN59',[U]),C('zeroMN59')))),App(C('LAMN59',[U]),B(1))))}]},
  {name:'LBMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[{name:'LBMN59.back',type:Pi(C('NatMN59'),Pi(App(C('LAMN59',[U]),B(0)),App(C('LBMN59',[U]),B(1))))}]},
 ]};
 const e=env59();for(const d of [Nat,zero,LiftBox])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,L);assert.match(pretty(e.get('LAMN59.rec').declaration.type),/LiftBoxMN59\.\{u, 0\}\(LiftBoxMN59\.\{u, 0\}/);assert.deepEqual(e.get('LAMN59.rec_2').declaration.levelParams.slice(1),['u']);
}

// Constructor-local target-index capture is still rejected.
{
 const Bad={kind:'mutualInductive',name:'BadPolyIdxMN59',levelParams:['u'],inductives:[
  {name:'BadAMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[{name:'BadAMN59.step',type:Pi(C('NatMN59'),Pi(App(C('BoxMN59',[U]),App(C('BoxMN59',[U]),App(C('BadBMN59',[U]),B(0)))),App(C('BadAMN59',[U]),B(1))))}]},
  {name:'BadBMN59',type:Pi(C('NatMN59'),TU),numParams:0,numIndices:1,constructors:[{name:'BadBMN59.base',type:Pi(C('NatMN59'),App(C('BadBMN59',[U]),B(0)))}]},
 ]};
 const e=env59();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/may not capture constructor\/index-local|nested mutual target|local/i);for(const n of ['BadAMN59','BadBMN59','BadAMN59.rec_1'])assert.equal(e.has(n),false);
}

// Strict Core v59 replay and frozen-v58 isolation.
{
 const declarations=[Nat,zero,Box,Deep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-polymorphic0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-indices0'),/positive mutual occurrence|mutual recursion|nested|polymorphic|constructor field|positive/i);
 const artifact=makeKernelMutualNestedDeeperPolymorphicArtifact(declarations);assert.equal(artifact.formatVersion,59);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-polymorphic0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:58}),/unsupported v58 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-indices0'}),/unsupported v59 implementation profile/);
 const historical=makeKernelMutualNestedDeeperIndicesArtifact([Nat,zero]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|nested|polymorphic|constructor field|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v59-')),file=path.join(dir,'v59.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatMN59','zeroMN59']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v59-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive Box.{u} (α : Type u) : Type u where | mk : α → Box α\nmutual\n  inductive A.{u} : Nat → Type u where\n    | leaf : A 0\n    | step (n : Nat) : Box.{u} (Box.{u} (B 0)) → A n\n  inductive B.{u} : Nat → Type u where\n    | back (n : Nat) : A n → B n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\ninductive LiftBox.{u,v} (α : Type u) : Type (max u v) where | mk : α → LiftBox α\nmutual\n  inductive LA.{u} : Nat → Type u where\n    | step (n : Nat) : LiftBox.{u,0} (LiftBox.{u,0} (LB 0)) → LA n\n  inductive LB.{u} : Nat → Type u where\n    | back (n : Nat) : LA n → LB n\nend\n#check LA.rec_1\n#check LA.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/A\.rec\.\{u_1, u\}/);assert.match(gr.stdout,/A\.rec_1\.\{u_1, u\}/);assert.match(gr.stdout,/A\.rec_2\.\{u_1, u\}/);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/LiftBox\.\{u, 0\}/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive Box.{u} (α : Type u) : Type u where | mk : α → Box α\nmutual\n  inductive A.{u} : Nat → Type u where\n    | step (n : Nat) : Box.{u+1} (Box.{u} (B 0)) → A n\n  inductive B.{u} : Nat → Type u where\n    | back (n : Nat) : A n → B n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Application type mismatch|universe|expected/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_POLYMORPHIC_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-polymorphic0',coreFormat:59,status:'accepted',supportedSlice:'Type-valued universe-polymorphic mutual families with per-member outer indices and one closed linear nested path of depth >=2 through monomorphic one-parameter indexless containers; explicit container universe instantiations preserved; target indices fixed or shared-parameter-derived',observations:{polymorphicDeepIndexed:'accepted',linkedIota:'accepted',sharedParameterDerivedTargetIndex:'accepted',explicitMultiUniverseDeepContainers:'accepted',helperLevelOrder:'accepted',localTargetIndexCapture:'rejected',universeMismatch:'rejected',serializedReplay:'accepted'},historicalIsolation:{v58PolymorphicDeepIndexed:'rejected'},explicitGaps:{deepPropComposition:'unsupported',deepIndexedContainers:'unsupported',multipleDeepFields:'unsupported',dependentContainerParameters:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v59 polymorphic deeper indexed mutual+nested preprocessing, explicit deep container levels, linked iota, locality, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
