import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperIndexedContainersArtifact,makeKernelMutualNestedDeeperPropArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true};
const env60=()=>new Environment(base),env61=()=>new Environment({...base,allowMutualNestedDeeperIndexedContainers:true});

const Bool={kind:'inductive',name:'BoolMN61',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BoolMN61.false',type:C('BoolMN61')},{name:'BoolMN61.true',type:C('BoolMN61')}]};
const Ix={kind:'inductive',name:'IxMN61',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN61.z',type:C('IxMN61')}]};
const OutP={kind:'inductive',name:'OutPMN61',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN61.out',type:C('OutPMN61')}]};
const IWrap={kind:'inductive',name:'IWrapMN61',levelParams:[],type:Pi(Prop,Pi(C('BoolMN61'),Prop)),numParams:1,numIndices:1,constructors:[{name:'IWrapMN61.mk',type:Pi(Prop,Pi(B(0),Apps(C('IWrapMN61'),[B(1),C('BoolMN61.true')]))) }]};
const ix=C('IxMN61'),z=C('IxMN61.z'),bool=C('BoolMN61'),tru=C('BoolMN61.true');
const deepField=(alpha,targetName)=>{const target=Apps(C(targetName,[U]),[alpha,z]),inner=Apps(C('IWrapMN61'),[target,tru]);return Apps(C('IWrapMN61'),[inner,tru]);};
const Deep={kind:'mutualInductive',name:'DeepIndexedPropMN61',levelParams:['u'],inductives:[
 {name:'AMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'AMN61.leaf',type:Pi(TU,Apps(C('AMN61',[U]),[B(0),z]))},
  {name:'AMN61.step',type:Pi(TU,Pi(ix,Pi(deepField(B(1),'BMN61'),Apps(C('AMN61',[U]),[B(2),B(1)]))))},
 ]},
 {name:'BMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'BMN61.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN61',[U]),[B(1),B(0)]),Apps(C('BMN61',[U]),[B(2),B(1)]))))},
 ]},
]};

// v61 admits deep indexed Prop containers; every helper retains its Bool index telescope.
{
 const old=env60();for(const d of [Bool,Ix,IWrap])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Deep),/nested|indexed|positive mutual occurrence|constructor field|mutual recursion|capture/i);
 const e=env61();for(const d of [Bool,Ix,IWrap])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Deep);
 for(const n of ['AMN61.rec','BMN61.rec','AMN61.rec_1','AMN61.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN61.rec_3'),false);
 const ar=e.get('AMN61.rec').declaration,h1=e.get('AMN61.rec_1').declaration,h2=e.get('AMN61.rec_2').declaration;
 for(const r of [ar,h1,h2]){assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,1,1]);}
 assert.equal(ar.metadata.numParams,1);assert.equal(ar.metadata.numIndices,1);assert.equal(h1.metadata.numIndices,1);assert.equal(h2.metadata.numIndices,1);
 assert.match(pretty(h1.type),/BoolMN61/);assert.match(pretty(h2.type),/BoolMN61/);
 assert.deepEqual(checked.generated,['AMN61.leaf','AMN61.step','BMN61.back','AMN61.rec','BMN61.rec','AMN61.rec_1','AMN61.rec_2']);
}

// Actual proof iota crosses both live-index helpers: A.step -> rec_1 true -> rec_2 true -> B.back -> A.leaf.
{
 const e=env61();for(const d of [Bool,Ix,OutP,IWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Deep);
 const alpha=ix,a0=Apps(C('AMN61',[Z]),[alpha,z]),b0=Apps(C('BMN61',[Z]),[alpha,z]);
 const innerTy=Apps(C('IWrapMN61'),[b0,tru]),outerTy=Apps(C('IWrapMN61'),[innerTy,tru]),out=C('OutPMN61');
 const args=[
  alpha,
  Lam(ix,Lam(Apps(C('AMN61',[Z]),[alpha,B(0)]),out)),
  Lam(ix,Lam(Apps(C('BMN61',[Z]),[alpha,B(0)]),out)),
  Lam(bool,Lam(Apps(C('IWrapMN61'),[innerTy,B(0)]),out)),
  Lam(bool,Lam(Apps(C('IWrapMN61'),[b0,B(0)]),out)),
  C('OutPMN61.out'),
  Lam(ix,Lam(outerTy,Lam(out,B(0)))),
  Lam(ix,Lam(Apps(C('AMN61',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  Lam(innerTy,Lam(out,B(0))),
  Lam(b0,Lam(out,B(0))),
 ];
 const leaf=App(C('AMN61.leaf',[Z]),alpha),back=Apps(C('BMN61.back',[Z]),[alpha,z,leaf]);
 const inner=Apps(C('IWrapMN61.mk'),[b0,back]),outer=Apps(C('IWrapMN61.mk'),[innerTy,inner]);
 const major=Apps(C('AMN61.step',[Z]),[alpha,z,outer]);
 const term=Apps(C('AMN61.rec',[Z]),[...args,z,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN61.out')),`v61 linked indexed-helper iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// The outermost helper index may remain constructor-local/live.
{
 const LocalOuter={kind:'mutualInductive',name:'LocalOuterMN61',levelParams:['u'],inductives:[
  {name:'AOMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'AOMN61.step',type:Pi(TU,Pi(ix,Pi(bool,Pi(Apps(C('IWrapMN61'),[Apps(C('IWrapMN61'),[Apps(C('BOMN61',[U]),[B(2),z]),tru]),B(0)]),Apps(C('AOMN61',[U]),[B(3),B(2)])))))}]},
  {name:'BOMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BOMN61.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AOMN61',[U]),[B(1),B(0)]),Apps(C('BOMN61',[U]),[B(2),B(1)]))))}]},
 ]};
 const e=env61();for(const d of [Bool,Ix,IWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,LocalOuter);const h=e.get('AOMN61.rec_1').declaration;assert.equal(h.kind,'recursor');assert.equal(h.metadata.numIndices,1);assert.deepEqual(h.metadata.mutual.indexCounts,[1,1,1,1]);
}

// A constructor-local index buried inside a deeper container parameter specialization is rejected.
{
 const BadInner={kind:'mutualInductive',name:'BadInnerMN61',levelParams:['u'],inductives:[
  {name:'AIMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'AIMN61.step',type:Pi(TU,Pi(ix,Pi(bool,Pi(Apps(C('IWrapMN61'),[Apps(C('IWrapMN61'),[Apps(C('BIMN61',[U]),[B(2),z]),B(0)]),tru]),Apps(C('AIMN61',[U]),[B(3),B(2)])))))}]},
  {name:'BIMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BIMN61.base',type:Pi(TU,Pi(ix,Apps(C('BIMN61',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env61();for(const d of [Bool,Ix,IWrap])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,BadInner),/v61 deep nested container parameter specialization may not capture constructor\/index-local|unsupported indexed-container shape/i);for(const n of ['AIMN61','BIMN61','AIMN61.rec_1'])assert.equal(e.has(n),false);
}

// Index domains that depend on the recursive target remain outside the bounded v61 slice.
{
 const DWrap={kind:'inductive',name:'DWrapMN61',levelParams:[],type:Pi(Prop,Pi(B(0),Prop)),numParams:1,numIndices:1,constructors:[{name:'DWrapMN61.mk',type:Pi(Prop,Pi(B(0),Apps(C('DWrapMN61'),[B(1),B(0)])))}]};
 const BadDomain={kind:'mutualInductive',name:'BadDomainMN61',levelParams:['u'],inductives:[
  {name:'ADMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'ADMN61.step',type:Pi(TU,Pi(ix,Pi(Apps(C('IWrapMN61'),[Apps(C('DWrapMN61'),[Apps(C('BDMN61',[U]),[B(1),z]),Apps(C('BDMN61.base',[U]),[B(1),z])]),tru]),Apps(C('ADMN61',[U]),[B(2),B(1)]))))}]},
  {name:'BDMN61',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BDMN61.base',type:Pi(TU,Pi(ix,Apps(C('BDMN61',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env61();for(const d of [Bool,Ix,IWrap,DWrap])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,BadDomain),/index domains independent of the recursive mutual target|nested container|v61/i);
}

// Strict Core v61 replay and frozen-v60 isolation.
{
 const declarations=[Bool,Ix,IWrap,Deep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-indexed-containers0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-prop0'),/nested|indexed|positive mutual occurrence|constructor field|mutual recursion|capture/i);
 const artifact=makeKernelMutualNestedDeeperIndexedContainersArtifact(declarations);assert.equal(artifact.formatVersion,61);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-indexed-containers0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:60}),/unsupported v60 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-prop0'}),/unsupported v61 implementation profile/);
 const historical=makeKernelMutualNestedDeeperPropArtifact([Bool,Ix,IWrap]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/nested|indexed|positive mutual occurrence|constructor field|mutual recursion|capture/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-indexed-containers-v61-')),file=path.join(dir,'v61.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-indexed-containers-v61-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive IWrap (P : Prop) : Bool → Prop where | mk : P → IWrap P true\nuniverse u\nmutual\n  inductive A (α : Type u) : Nat → Prop where\n    | leaf : A α 0\n    | step (n : Nat) : IWrap (IWrap (B α 0) true) true → A α n\n  inductive B (α : Type u) : Nat → Prop where\n    | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/motive_3[\s\S]*\(a : Bool\)[\s\S]*IWrap \(IWrap \(B\.\{u\} α/);assert.match(gr.stdout,/motive_4[\s\S]*\(a : Bool\)[\s\S]*IWrap \(B\.\{u\} α/);const indexMatches=gr.stdout.match(/number of indices: 1/g)??[];assert.ok(indexMatches.length>=3,`expected indexed A and both helpers, got ${indexMatches.length}`);
 const local=path.join(dir,'Local.lean');fs.writeFileSync(local,`set_option inductive.autoPromoteIndices false\ninductive IWrap (P : Prop) : Bool → Prop where | mk : P → IWrap P true\nuniverse u\nmutual\n inductive A1 (α : Type u) : Nat → Prop where | leaf : A1 α 0 | step (n : Nat) (b : Bool) : IWrap (IWrap (B1 α 0) true) b → A1 α n\n inductive B1 (α : Type u) : Nat → Prop where | back (n : Nat) : A1 α n → B1 α n\nend\n#print A1.rec_1\n`);const lr=spawnSync(lean,[local],{encoding:'utf8'});assert.equal(lr.status,0,lr.stderr||lr.stdout);assert.match(lr.stdout,/number of indices: 1/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive IWrap (P : Prop) : Bool → Prop where | mk : P → IWrap P true\nuniverse u\nmutual\n inductive A2 (α : Type u) : Nat → Prop where | leaf : A2 α 0 | step (n : Nat) (b : Bool) : IWrap (IWrap (B2 α 0) b) true → A2 α n\n inductive B2 (α : Type u) : Nat → Prop where | back (n : Nat) : A2 α n → B2 α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match((br.stderr||'')+(br.stdout||''),/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_INDEXED_CONTAINERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-indexed-containers0',coreFormat:61,status:'accepted',supportedSlice:'universe-polymorphic Prop-valued mutual blocks with shared parameters, per-member outer indices, and one linear deep nested path of depth >=2 through one-parameter indexed Prop containers whose index domains are independent of the recursive mutual target; each helper retains its own live container index telescope, while deeper parameter specializations and final target indices are fixed/shared-parameter-derived',observations:{deepIndexedProp:'accepted',helperIndexTelescopes:'preserved',outerLocalHelperIndex:'accepted',innerLocalSpecializationIndex:'rejected',targetDependentIndexDomain:'rejected',linkedIndexedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v60DeepIndexedContainers:'rejected'},explicitGaps:{multipleDeepFields:'unsupported',dependentIndexedContainerDomains:'unsupported',multiParameterDeepIndexedContainers:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v61 deep indexed Prop containers, live helper indices, locality boundary, linked iota, replay, v60 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
