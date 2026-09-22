import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperDependentContainerParametersArtifact,makeKernelMutualNestedDeeperMultiParameterContainersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true};
const env62=()=>new Environment(base),env63=()=>new Environment({...base,allowMutualNestedDeeperDependentContainerParameters:true});

const Bool={kind:'inductive',name:'BoolMN63',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BoolMN63.false',type:C('BoolMN63')},{name:'BoolMN63.true',type:C('BoolMN63')}]};
const Ix={kind:'inductive',name:'IxMN63',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN63.z',type:C('IxMN63')}]};
const TrueP={kind:'inductive',name:'TrueMN63',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'TrueMN63.intro',type:C('TrueMN63')}]};
const OutP={kind:'inductive',name:'OutPMN63',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN63.out',type:C('OutPMN63')}]};
// DWrap (P : Prop) (Q : P -> Prop) : Bool -> Prop
const DWrap={kind:'inductive',name:'DWrapMN63',levelParams:[],type:Pi(Prop,Pi(Pi(B(0),Prop),Pi(C('BoolMN63'),Prop))),numParams:2,numIndices:1,constructors:[{name:'DWrapMN63.mk',type:Pi(Prop,Pi(Pi(B(0),Prop),Pi(B(1),Pi(App(B(1),B(0)),Apps(C('DWrapMN63'),[B(3),B(2),C('BoolMN63.true')])))))}]};
const ix=C('IxMN63'),z=C('IxMN63.z'),bool=C('BoolMN63'),tru=C('BoolMN63.true'),tp=C('TrueMN63'),tpi=C('TrueMN63.intro');
const target=(alpha,name='BMN63')=>Apps(C(name,[U]),[alpha,z]);
const qfun=p=>Lam(p,tp);
const inner=(alpha,name='BMN63')=>{const p=target(alpha,name);return Apps(C('DWrapMN63'),[p,qfun(p),tru]);};
const outer=(alpha,name='BMN63')=>{const p=inner(alpha,name);return Apps(C('DWrapMN63'),[p,qfun(p),tru]);};
const Deep={kind:'mutualInductive',name:'DeepDependentMN63',levelParams:['u'],inductives:[
 {name:'AMN63',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'AMN63.leaf',type:Pi(TU,Apps(C('AMN63',[U]),[B(0),z]))},{name:'AMN63.step',type:Pi(TU,Pi(ix,Pi(outer(B(1)),Apps(C('AMN63',[U]),[B(2),B(1)]))))}]},
 {name:'BMN63',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BMN63.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN63',[U]),[B(1),B(0)]),Apps(C('BMN63',[U]),[B(2),B(1)]))))}]},
]};

// v63 admits the dependent parameter telescope; frozen v62 does not.
{
 const old=env62();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Deep),/independent Prop parameters|recursive parameter slot|nested|v62/i);
 const e=env63();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Deep);
 for(const n of ['AMN63.rec','BMN63.rec','AMN63.rec_1','AMN63.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN63.rec_3'),false);
 for(const n of ['AMN63.rec','AMN63.rec_1','AMN63.rec_2']){const r=e.get(n).declaration;assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,1,1]);assert.equal(r.metadata.numIndices,1);}
 assert.equal(e.get('AMN63.rec_1').declaration.metadata.rules[0].ctorParamCount,2);assert.equal(e.get('AMN63.rec_2').declaration.metadata.rules[0].ctorParamCount,2);
 assert.deepEqual(checked.generated,['AMN63.leaf','AMN63.step','BMN63.back','AMN63.rec','BMN63.rec','AMN63.rec_1','AMN63.rec_2']);
}

// Actual proof iota crosses both dependent-parameter helpers.
{
 const e=env63();for(const d of [Bool,Ix,TrueP,OutP,DWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Deep);
 const alpha=ix,b0=Apps(C('BMN63',[Z]),[alpha,z]),iq=qfun(b0),innerTy=Apps(C('DWrapMN63'),[b0,iq,tru]),oq=qfun(innerTy),outerTy=Apps(C('DWrapMN63'),[innerTy,oq,tru]),out=C('OutPMN63');
 const args=[alpha,
  Lam(ix,Lam(Apps(C('AMN63',[Z]),[alpha,B(0)]),out)),Lam(ix,Lam(Apps(C('BMN63',[Z]),[alpha,B(0)]),out)),
  Lam(bool,Lam(Apps(C('DWrapMN63'),[innerTy,oq,B(0)]),out)),Lam(bool,Lam(Apps(C('DWrapMN63'),[b0,iq,B(0)]),out)),
  C('OutPMN63.out'),
  Lam(ix,Lam(outerTy,Lam(out,B(0)))),
  Lam(ix,Lam(Apps(C('AMN63',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  Lam(innerTy,Lam(tp,Lam(out,B(0)))),
  Lam(b0,Lam(tp,Lam(out,B(0)))),
 ];
 const leaf=App(C('AMN63.leaf',[Z]),alpha),back=Apps(C('BMN63.back',[Z]),[alpha,z,leaf]);
 const innerVal=Apps(C('DWrapMN63.mk'),[b0,iq,back,tpi]),outerVal=Apps(C('DWrapMN63.mk'),[innerTy,oq,innerVal,tpi]);
 const major=Apps(C('AMN63.step',[Z]),[alpha,z,outerVal]),term=Apps(C('AMN63.rec',[Z]),[...args,z,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN63.out')),`v63 linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// A constructor-local dependent parameter specialization remains rejected.
{
 const qTy=alpha=>Pi(target(alpha,'BLMN63'),Prop);
 const badField=alpha=>{const p=target(alpha,'BLMN63'),innerBad=Apps(C('DWrapMN63'),[p,B(0),tru]);return Apps(C('DWrapMN63'),[innerBad,qfun(innerBad),tru]);};
 const D={kind:'mutualInductive',name:'BadLocalDependentMN63',levelParams:['u'],inductives:[
  {name:'ALMN63',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'ALMN63.step',type:Pi(TU,Pi(ix,Pi(qTy(B(1)),Pi(badField(B(2)),Apps(C('ALMN63',[U]),[B(3),B(2)])))))}]},
  {name:'BLMN63',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BLMN63.base',type:Pi(TU,Pi(ix,Apps(C('BLMN63',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env63();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,D),/capture constructor\/index-local|dependent parameter|specialization|v63/i);
}

// Strict Core v63 replay and frozen-v62 isolation.
{
 const declarations=[Bool,Ix,TrueP,DWrap,Deep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-dependent-container-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multi-parameter-containers0'),/independent Prop parameters|recursive parameter slot|nested|v62/i);
 const artifact=makeKernelMutualNestedDeeperDependentContainerParametersArtifact(declarations);assert.equal(artifact.formatVersion,63);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-dependent-container-parameters0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:62}),/unsupported v62 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-multi-parameter-containers0'}),/unsupported v63 implementation profile/);
 const historical=makeKernelMutualNestedDeeperMultiParameterContainersArtifact([Bool,Ix,TrueP,DWrap]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/independent Prop parameters|recursive parameter slot|nested|v62/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v63-replay-')),file=path.join(dir,'v63.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v63-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive DWrap (P : Prop) (Q : P → Prop) : Bool → Prop where | mk (p : P) (q : Q p) : DWrap P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) : DWrap (DWrap (B α 0) (fun _ => True) true) (fun _ => True) true → A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.ok((gr.stdout.match(/number of indices: 1/g)??[]).length>=3);assert.match(gr.stdout,/DWrap/);
 const bad=path.join(dir,'BadLocal.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive DWrap (P : Prop) (Q : P → Prop) : Bool → Prop where | mk (p : P) (q : Q p) : DWrap P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | step (n : Nat) (Q : (B α 0) → Prop) : DWrap (DWrap (B α 0) Q true) (fun _ => True) true → A α n\n inductive B (α : Type u) : Nat → Prop where | base (n : Nat) : B α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match((br.stderr||'')+(br.stdout||''),/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_DEPENDENT_CONTAINER_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-dependent-container-parameters0',coreFormat:63,status:'accepted',supportedSlice:'deep universe-polymorphic indexed Prop mutual/nested graphs through multi-parameter indexed Prop containers whose parameter telescope may depend on earlier parameters; parameters are checked sequentially after staging mutual family signatures, exactly one top-level parameter slot per layer carries the recursive path, and helper indices remain live',observations:{dependentParameterTelescope:'accepted',helperIndexTelescopes:'preserved',linkedIota:'accepted',localDependentParameterCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v62DependentContainerParameters:'rejected'},explicitGaps:{multipleDeepFields:'unsupported',multipleRecursiveTopLevelParameterSlots:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v63 dependent container parameter telescopes, live helper indices, linked iota, locality, replay, v62 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
