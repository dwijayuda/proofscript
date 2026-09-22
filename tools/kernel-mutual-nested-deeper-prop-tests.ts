import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperPropArtifact,makeKernelMutualNestedDeeperPolymorphicArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true};
const env59=()=>new Environment(base),env60=()=>new Environment({...base,allowMutualNestedDeeperProp:true});

// Closed index type and output proposition keep replay assumption-free.
const Ix={kind:'inductive',name:'IxMN60',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN60.z',type:C('IxMN60')}]};
const OutP={kind:'inductive',name:'OutPMN60',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN60.out',type:C('OutPMN60')}]};
const WrapP={kind:'inductive',name:'WrapPMN60',levelParams:[],type:Pi(Prop,Prop),numParams:1,numIndices:0,constructors:[{name:'WrapPMN60.mk',type:Pi(Prop,Pi(B(0),App(C('WrapPMN60'),B(1))))}]};
const ix=C('IxMN60'),z=C('IxMN60.z');
const Deep={kind:'mutualInductive',name:'DeepPropMN60',levelParams:['u'],inductives:[
 {name:'AMN60',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'AMN60.leaf',type:Pi(TU,Apps(C('AMN60',[U]),[B(0),z]))},
  {name:'AMN60.step',type:Pi(TU,Pi(ix,Pi(App(C('WrapPMN60'),App(C('WrapPMN60'),Apps(C('BMN60',[U]),[B(1),z]))),Apps(C('AMN60',[U]),[B(2),B(1)]))))},
 ]},
 {name:'BMN60',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'BMN60.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN60',[U]),[B(1),B(0)]),Apps(C('BMN60',[U]),[B(2),B(1)]))))},
 ]},
]};

// v60 admits the deep Prop graph, keeps original indices, creates two Prop-only helpers, and adds no motive universe.
{
 const old=env59();for(const d of [Ix,WrapP])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Deep),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const e=env60();for(const d of [Ix,WrapP])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Deep);
 for(const n of ['AMN60.rec','BMN60.rec','AMN60.rec_1','AMN60.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN60.rec_3'),false);
 const ar=e.get('AMN60.rec').declaration,h1=e.get('AMN60.rec_1').declaration,h2=e.get('AMN60.rec_2').declaration;
 for(const r of [ar,h1,h2]){assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);}
 assert.equal(ar.metadata.numParams,1);assert.equal(ar.metadata.numIndices,1);assert.equal(h1.metadata.numIndices,0);assert.equal(h2.metadata.numIndices,0);
 const rt=pretty(ar.type);assert.match(rt,/WrapPMN60\(WrapPMN60\(BMN60\.\{u\}/);assert.match(rt,/→ Prop/);
 assert.deepEqual(checked.generated,['AMN60.leaf','AMN60.step','BMN60.back','AMN60.rec','BMN60.rec','AMN60.rec_1','AMN60.rec_2']);
}

// Actual proof iota: A.step z -> helper1 -> helper2 -> B.back z -> A.leaf.
{
 const e=env60();for(const d of [Ix,OutP,WrapP])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Deep);
 const alpha=ix,a0=Apps(C('AMN60',[Z]),[alpha,z]),b0=Apps(C('BMN60',[Z]),[alpha,z]),wrapB=App(C('WrapPMN60'),b0),wrapwrapB=App(C('WrapPMN60'),wrapB),outP=C('OutPMN60');
 const args=[
  alpha,
  Lam(ix,Lam(Apps(C('AMN60',[Z]),[alpha,B(0)]),outP)),
  Lam(ix,Lam(Apps(C('BMN60',[Z]),[alpha,B(0)]),outP)),
  Lam(wrapwrapB,outP),Lam(wrapB,outP),
  C('OutPMN60.out'),
  Lam(ix,Lam(wrapwrapB,Lam(outP,B(0)))),
  Lam(ix,Lam(Apps(C('AMN60',[Z]),[alpha,B(0)]),Lam(outP,B(0)))),
  Lam(wrapB,Lam(outP,B(0))),
  Lam(b0,Lam(outP,B(0))),
 ];
 const leaf=App(C('AMN60.leaf',[Z]),alpha);
 const back=Apps(C('BMN60.back',[Z]),[alpha,z,leaf]);
 const inner=Apps(C('WrapPMN60.mk'),[b0,back]);
 const outer=Apps(C('WrapPMN60.mk'),[wrapB,inner]);
 const major=Apps(C('AMN60.step',[Z]),[alpha,z,outer]);
 const term=Apps(C('AMN60.rec',[Z]),[...args,z,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN60.out')),`v60 linked deep Prop iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),outP));

 // Large elimination is impossible: motives returning Type do not inhabit the recursor's expected Prop-valued motive type.
 const badM=Lam(ix,Lam(Apps(C('AMN60',[Z]),[alpha,B(0)]),S(L1)));
 assert.throws(()=>infer(e,[],Apps(C('AMN60.rec',[Z]),[alpha,badM])),/type mismatch|expected|function argument|definitional/i);
}

// Shared-parameter-derived fixed target index remains allowed under the deep Prop graph.
{
 const P={kind:'mutualInductive',name:'ParamDeepPropMN60',levelParams:['u'],inductives:[
  {name:'PAMN60',type:Pi(TU,Pi(ix,Pi(ix,Prop))),numParams:2,numIndices:1,constructors:[{name:'PAMN60.step',type:Pi(TU,Pi(ix,Pi(ix,Pi(App(C('WrapPMN60'),App(C('WrapPMN60'),Apps(C('PBMN60',[U]),[B(2),B(1),B(1)]))),Apps(C('PAMN60',[U]),[B(3),B(2),B(1)])))))}]},
  {name:'PBMN60',type:Pi(TU,Pi(ix,Pi(ix,Prop))),numParams:2,numIndices:1,constructors:[{name:'PBMN60.back',type:Pi(TU,Pi(ix,Pi(ix,Pi(Apps(C('PAMN60',[U]),[B(2),B(1),B(0)]),Apps(C('PBMN60',[U]),[B(3),B(2),B(1)])))))}]},
 ]};
 const e=env60();for(const d of [Ix,WrapP])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,P);const r=e.get('PAMN60.rec').declaration;assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);
}

// Constructor-local target index capture remains rejected; direct varying-index recursion stays legal.
{
 const Bad={kind:'mutualInductive',name:'BadDeepPropMN60',levelParams:['u'],inductives:[
  {name:'BadAMN60',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BadAMN60.step',type:Pi(TU,Pi(ix,Pi(App(C('WrapPMN60'),App(C('WrapPMN60'),Apps(C('BadBMN60',[U]),[B(1),B(0)]))),Apps(C('BadAMN60',[U]),[B(2),B(1)]))))}]},
  {name:'BadBMN60',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BadBMN60.base',type:Pi(TU,Pi(ix,Apps(C('BadBMN60',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env60();for(const d of [Ix,WrapP])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/may not capture constructor\/index-local|nested mutual target|local/i);for(const n of ['BadAMN60','BadBMN60','BadAMN60.rec_1'])assert.equal(e.has(n),false);
}

// Strict Core v60 replay and frozen-v59 isolation.
{
 const declarations=[Ix,WrapP,Deep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-prop0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-polymorphic0'),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const artifact=makeKernelMutualNestedDeeperPropArtifact(declarations);assert.equal(artifact.formatVersion,60);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-prop0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:59}),/unsupported v59 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-polymorphic0'}),/unsupported v60 implementation profile/);
 const historical=makeKernelMutualNestedDeeperPolymorphicArtifact([Ix,WrapP]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-prop-v60-')),file=path.join(dir,'v60.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-prop-v60-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive WrapP (P : Prop) : Prop where | mk : P → WrapP P\nuniverse u\nmutual\n  inductive A (α : Type u) : Nat → Prop where\n    | leaf : A α 0\n    | step (n : Nat) : WrapP (WrapP (B α 0)) → A α n\n  inductive B (α : Type u) : Nat → Prop where\n    | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/A\.rec\.\{u\}/);assert.match(gr.stdout,/number of parameters: 1/);assert.match(gr.stdout,/number of indices: 1/);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/motive_3 : WrapP \(WrapP \(B\.\{u\} α/);assert.match(gr.stdout,/motive_4 : WrapP \(B\.\{u\} α/);assert.doesNotMatch(gr.stdout,/A\.rec\.\{u_1, u\}/);
 const badLarge=path.join(dir,'BadLarge.lean');fs.writeFileSync(badLarge,`set_option inductive.autoPromoteIndices false\ninductive WrapP (P : Prop) : Prop where | mk : P → WrapP P\nuniverse u\nmutual\n  inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) : WrapP (WrapP (B α 0)) → A α n\n  inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\nexample {α : Type u} (a : A α 0) : Nat := A.rec (motive_1 := fun _ _ => Nat) (motive_2 := fun _ _ => Nat) (motive_3 := fun _ => Nat) (motive_4 := fun _ => Nat) 0 (fun _ _ _ => 0) (fun _ _ _ => 0) (fun _ _ => 0) (fun _ _ => 0) a\n`);const bl=spawnSync(lean,[badLarge],{encoding:'utf8'});assert.notEqual(bl.status,0);assert.match(bl.stderr+bl.stdout,/expected to have type\s+Prop|type mismatch|Sort/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_PROP_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-prop0',coreFormat:60,status:'accepted',supportedSlice:'universe-polymorphic Prop-valued mutual blocks with shared parameters, per-member outer indices, and exactly one linear deep nested path of depth >=2 through one-parameter zero-index Prop containers; nested target indices are fixed or shared-parameter-derived',observations:{deepIndexedProp:'accepted',fourMotiveOrder:'accepted',propOnlyMotiveFamily:'accepted',noFreshMotiveUniverse:'accepted',linkedDeepProofIota:'accepted',sharedParameterDerivedTargetIndex:'accepted',localTargetCapture:'rejected',largeElimination:'rejected',serializedReplay:'accepted'},historicalIsolation:{v59DeepProp:'rejected'},explicitGaps:{multipleDeepFields:'unsupported',indexedOrDependentDeepPropContainers:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v60 deep polymorphic/indexed mutual+nested Prop composition, Prop-only motives, linked proof iota, locality rejection, replay, v59 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
