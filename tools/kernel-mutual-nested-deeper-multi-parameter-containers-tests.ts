import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperMultiParameterContainersArtifact,makeKernelMutualNestedDeeperIndexedContainersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true};
const env61=()=>new Environment(base),env62=()=>new Environment({...base,allowMutualNestedDeeperMultiParameterContainers:true});

const Bool={kind:'inductive',name:'BoolMN62',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BoolMN62.false',type:C('BoolMN62')},{name:'BoolMN62.true',type:C('BoolMN62')}]};
const Ix={kind:'inductive',name:'IxMN62',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN62.z',type:C('IxMN62')}]};
const TrueP={kind:'inductive',name:'TrueMN62',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'TrueMN62.intro',type:C('TrueMN62')}]};
const OutP={kind:'inductive',name:'OutPMN62',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN62.out',type:C('OutPMN62')}]};
const IWrap2={kind:'inductive',name:'IWrap2MN62',levelParams:[],type:Pi(Prop,Pi(Prop,Pi(C('BoolMN62'),Prop))),numParams:2,numIndices:1,constructors:[{name:'IWrap2MN62.mk',type:Pi(Prop,Pi(Prop,Pi(B(1),Pi(B(1),Apps(C('IWrap2MN62'),[B(3),B(2),C('BoolMN62.true')])))))}]};
const ix=C('IxMN62'),z=C('IxMN62.z'),bool=C('BoolMN62'),tru=C('BoolMN62.true'),tp=C('TrueMN62'),tpi=C('TrueMN62.intro');
const target=(alpha,name='BMN62')=>Apps(C(name,[U]),[alpha,z]);
const inner=(alpha,name='BMN62')=>Apps(C('IWrap2MN62'),[target(alpha,name),tp,tru]);
const outer=(alpha,name='BMN62')=>Apps(C('IWrap2MN62'),[inner(alpha,name),tp,tru]);
const Deep={kind:'mutualInductive',name:'DeepMultiMN62',levelParams:['u'],inductives:[
 {name:'AMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'AMN62.leaf',type:Pi(TU,Apps(C('AMN62',[U]),[B(0),z]))},{name:'AMN62.step',type:Pi(TU,Pi(ix,Pi(outer(B(1)),Apps(C('AMN62',[U]),[B(2),B(1)]))))}]},
 {name:'BMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BMN62.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN62',[U]),[B(1),B(0)]),Apps(C('BMN62',[U]),[B(2),B(1)]))))}]},
]};

// v62 admits a deep two-parameter indexed Prop chain and preserves one live helper index per layer.
{
 const old=env61();for(const d of [Bool,Ix,TrueP,IWrap2])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Deep),/nested|multi|positive mutual occurrence|container|capture/i);
 const e=env62();for(const d of [Bool,Ix,TrueP,IWrap2])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Deep);
 for(const n of ['AMN62.rec','BMN62.rec','AMN62.rec_1','AMN62.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN62.rec_3'),false);
 for(const n of ['AMN62.rec','AMN62.rec_1','AMN62.rec_2']){const r=e.get(n).declaration;assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,1,1]);assert.equal(r.metadata.numIndices,1);}
 assert.equal(e.get('AMN62.rec_1').declaration.metadata.rules[0].ctorParamCount,2);assert.equal(e.get('AMN62.rec_2').declaration.metadata.rules[0].ctorParamCount,2);
 assert.deepEqual(checked.generated,['AMN62.leaf','AMN62.step','BMN62.back','AMN62.rec','BMN62.rec','AMN62.rec_1','AMN62.rec_2']);
}

// Actual proof iota crosses both multi-parameter helpers.
{
 const e=env62();for(const d of [Bool,Ix,TrueP,OutP,IWrap2])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Deep);
 const alpha=ix,b0=Apps(C('BMN62',[Z]),[alpha,z]),innerTy=Apps(C('IWrap2MN62'),[b0,tp,tru]),outerTy=Apps(C('IWrap2MN62'),[innerTy,tp,tru]),out=C('OutPMN62');
 const args=[alpha,
  Lam(ix,Lam(Apps(C('AMN62',[Z]),[alpha,B(0)]),out)),Lam(ix,Lam(Apps(C('BMN62',[Z]),[alpha,B(0)]),out)),
  Lam(bool,Lam(Apps(C('IWrap2MN62'),[innerTy,tp,B(0)]),out)),Lam(bool,Lam(Apps(C('IWrap2MN62'),[b0,tp,B(0)]),out)),
  C('OutPMN62.out'),
  Lam(ix,Lam(outerTy,Lam(out,B(0)))),
  Lam(ix,Lam(Apps(C('AMN62',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  Lam(innerTy,Lam(tp,Lam(out,B(0)))),
  Lam(b0,Lam(tp,Lam(out,B(0)))),
 ];
 const leaf=App(C('AMN62.leaf',[Z]),alpha),back=Apps(C('BMN62.back',[Z]),[alpha,z,leaf]);
 const innerVal=Apps(C('IWrap2MN62.mk'),[b0,tp,back,tpi]),outerVal=Apps(C('IWrap2MN62.mk'),[innerTy,tp,innerVal,tpi]);
 const major=Apps(C('AMN62.step',[Z]),[alpha,z,outerVal]);const term=Apps(C('AMN62.rec',[Z]),[...args,z,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN62.out')),`v62 linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// The recursive path may occupy the second parameter slot at each layer.
{
 const target2=alpha=>Apps(C('B2MN62',[U]),[alpha,z]);const inner2=alpha=>Apps(C('IWrap2MN62'),[tp,target2(alpha),tru]);const outer2=alpha=>Apps(C('IWrap2MN62'),[tp,inner2(alpha),tru]);
 const D={kind:'mutualInductive',name:'DeepSecondMN62',levelParams:['u'],inductives:[{name:'A2MN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'A2MN62.step',type:Pi(TU,Pi(ix,Pi(outer2(B(1)),Apps(C('A2MN62',[U]),[B(2),B(1)]))))}]},{name:'B2MN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'B2MN62.back',type:Pi(TU,Pi(ix,Pi(Apps(C('A2MN62',[U]),[B(1),B(0)]),Apps(C('B2MN62',[U]),[B(2),B(1)]))))}]}]};
 const e=env62();for(const d of [Bool,Ix,TrueP,IWrap2])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,D);assert.equal(e.get('A2MN62.rec_1').declaration.metadata.rules[0].recursiveFields[1],true);assert.equal(e.get('A2MN62.rec_2').declaration.metadata.rules[0].recursiveFields[1],true);
}

// Multiple recursive parameter slots in one container layer are outside v62.
{
 const badInner=Apps(C('IWrap2MN62'),[target(B(1),'BMMN62'),target(B(1),'BMMN62'),tru]);const badOuter=Apps(C('IWrap2MN62'),[badInner,tp,tru]);
 const D={kind:'mutualInductive',name:'BadMultiSlotMN62',levelParams:['u'],inductives:[{name:'AMMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'AMMN62.step',type:Pi(TU,Pi(ix,Pi(badOuter,Apps(C('AMMN62',[U]),[B(2),B(1)]))))}]},{name:'BMMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BMMN62.base',type:Pi(TU,Pi(ix,Apps(C('BMMN62',[U]),[B(1),B(0)])))}]}]};
 const e=env62();for(const d of [Bool,Ix,TrueP,IWrap2])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,D),/exactly one recursive parameter slot|v62/i);
}

// A fixed nonrecursive parameter may not capture a constructor-local proposition.
{
 const D={kind:'mutualInductive',name:'BadLocalFixedMN62',levelParams:['u'],inductives:[{name:'ALMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'ALMN62.step',type:Pi(TU,Pi(ix,Pi(Prop,Pi(Apps(C('IWrap2MN62'),[Apps(C('IWrap2MN62'),[Apps(C('BLMN62',[U]),[B(2),z]),B(0),tru]),tp,tru]),Apps(C('ALMN62',[U]),[B(3),B(2)])))))}]},{name:'BLMN62',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BLMN62.base',type:Pi(TU,Pi(ix,Apps(C('BLMN62',[U]),[B(1),B(0)])))}]}]};
 const e=env62();for(const d of [Bool,Ix,TrueP,IWrap2])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,D),/capture constructor\/index-local|specialization|v62/i);
}

// Strict Core v62 replay and frozen-v61 isolation.
{
 const declarations=[Bool,Ix,TrueP,IWrap2,Deep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multi-parameter-containers0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-indexed-containers0'),/nested|multi|positive mutual occurrence|container|capture/i);
 const artifact=makeKernelMutualNestedDeeperMultiParameterContainersArtifact(declarations);assert.equal(artifact.formatVersion,62);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-multi-parameter-containers0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:61}),/unsupported v61 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-indexed-containers0'}),/unsupported v62 implementation profile/);
 const historical=makeKernelMutualNestedDeeperIndexedContainersArtifact([Bool,Ix,TrueP,IWrap2]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/nested|multi|positive mutual occurrence|container|capture/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v62-replay-')),file=path.join(dir,'v62.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v62-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive IWrap2 (P Q : Prop) : Bool → Prop where | mk : P → Q → IWrap2 P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) : IWrap2 (IWrap2 (B α 0) True true) True true → A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/IWrap2/);assert.ok((gr.stdout.match(/number of indices: 1/g)??[]).length>=3);
 const second=path.join(dir,'Second.lean');fs.writeFileSync(second,`set_option inductive.autoPromoteIndices false\ninductive IWrap2 (P Q : Prop) : Bool → Prop where | mk : P → Q → IWrap2 P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | step (n : Nat) : IWrap2 True (IWrap2 True (B α 0) true) true → A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec_1\n#print A.rec_2\n`);const sr=spawnSync(lean,[second],{encoding:'utf8'});assert.equal(sr.status,0,sr.stderr||sr.stdout);assert.match(sr.stdout,/number of motives: 4/);
 const bad=path.join(dir,'BadLocal.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive IWrap2 (P Q : Prop) : Bool → Prop where | mk : P → Q → IWrap2 P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | step (n : Nat) (P : Prop) : IWrap2 (IWrap2 (B α 0) P true) True true → A α n\n inductive B (α : Type u) : Nat → Prop where | base (n : Nat) : B α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match((br.stderr||'')+(br.stdout||''),/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_MULTI_PARAMETER_CONTAINERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-multi-parameter-containers0',coreFormat:62,status:'accepted',supportedSlice:'universe-polymorphic Prop mutual blocks with shared parameters, outer indices, and one linear deep path through indexed Prop containers with arbitrary parameter arity; exactly one parameter slot per layer carries the recursive path, all parameter specializations project to the shared mutual context, and each helper preserves the current container index telescope',observations:{recursiveFirstParameter:'accepted',recursiveSecondParameter:'accepted',helperIndexTelescopes:'preserved',linkedIota:'accepted',multipleRecursiveParameterSlots:'rejected',localFixedParameterCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v61MultiParameterDeepContainers:'rejected'},explicitGaps:{dependentContainerParameterTelescopes:'unsupported',multipleDeepFields:'unsupported',multipleRecursiveParameterSlots:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v62 deep multi-parameter indexed Prop containers, arbitrary recursive parameter slot, linked iota, locality, replay, v61 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
