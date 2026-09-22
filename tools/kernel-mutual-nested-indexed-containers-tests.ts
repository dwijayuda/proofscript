import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedIndexedContainersArtifact,makeKernelMutualNestedPropArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true};
const env54=()=>new Environment(base),env55=()=>new Environment({...base,allowMutualNestedIndexedContainers:true});

const Bool={kind:'inductive',name:'BoolMN55',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BoolMN55.false',type:C('BoolMN55')},{name:'BoolMN55.true',type:C('BoolMN55')}]};
const IBox={kind:'inductive',name:'IBoxMN55',levelParams:[],type:Pi(S(L1),Pi(C('BoolMN55'),S(L1))),numParams:1,numIndices:1,constructors:[{name:'IBoxMN55.mk',type:Pi(S(L1),Pi(B(0),Apps(C('IBoxMN55'),[B(1),C('BoolMN55.true')]))) }]};
const AB={kind:'mutualInductive',name:'ABMN55',levelParams:[],inductives:[
 {name:'AMN55',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'AMN55.leaf',type:C('AMN55')},{name:'AMN55.step',type:Pi(Apps(C('IBoxMN55'),[C('BMN55'),C('BoolMN55.true')]),C('AMN55'))}]},
 {name:'BMN55',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BMN55.back',type:Pi(C('AMN55'),C('BMN55'))}]},
]};

// Type-valued indexed nested container keeps its own index telescope in the helper.
{
 const e=env55();for(const d of [Bool,IBox])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,AB);
 for(const n of ['AMN55.rec','BMN55.rec','AMN55.rec_1'])assert.ok(e.has(n),`missing ${n}`);
 const ar=e.get('AMN55.rec').declaration,hr=e.get('AMN55.rec_1').declaration;assert.equal(ar.kind,'recursor');assert.equal(hr.kind,'recursor');
 assert.deepEqual(ar.metadata.mutual.indexCounts,[0,0,1]);assert.equal(hr.metadata.numIndices,1);assert.match(pretty(hr.type),/BoolMN55/);assert.match(pretty(hr.type),/IBoxMN55\(BMN55/);
 assert.deepEqual(checked.generated,['AMN55.leaf','AMN55.step','BMN55.back','AMN55.rec','BMN55.rec','AMN55.rec_1']);
}

// Actual linked indexed-helper iota.
{
 const e=env55();for(const d of [Bool,IBox,AB])checkAndAddDeclaration(e,d);
 const R={kind:'axiom',name:'ResultMN55',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'result0MN55',levelParams:[],type:C('ResultMN55')};for(const d of [R,r0])checkAndAddDeclaration(e,d);
 const a=C('AMN55'),b=C('BMN55'),ibTrue=Apps(C('IBoxMN55'),[b,C('BoolMN55.true')]),out=C('ResultMN55');
 const ma=Lam(a,out),mb=Lam(b,out),mx=Lam(C('BoolMN55'),Lam(Apps(C('IBoxMN55'),[b,B(0)]),out));
 const leafMinor=C('result0MN55'),stepMinor=Lam(ibTrue,Lam(out,B(0))),backMinor=Lam(a,Lam(out,B(0))),boxMinor=Lam(b,Lam(out,B(0)));
 const leaf=C('AMN55.leaf'),back=App(C('BMN55.back'),leaf),boxed=Apps(C('IBoxMN55.mk'),[b,back]),major=App(C('AMN55.step'),boxed);
 const term=Apps(C('AMN55.rec',[L1]),[ma,mb,mx,leafMinor,stepMinor,backMinor,boxMinor,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0MN55')),`v55 linked indexed-container iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Prop-valued indexed nested container composes with v54 Prop-only motives.
const IWrap={kind:'inductive',name:'IWrapMN55',levelParams:[],type:Pi(S(L0),Pi(C('BoolMN55'),S(L0))),numParams:1,numIndices:1,constructors:[{name:'IWrapMN55.mk',type:Pi(S(L0),Pi(B(0),Apps(C('IWrapMN55'),[B(1),C('BoolMN55.true')]))) }]};
const PAB={kind:'mutualInductive',name:'PABMN55',levelParams:[],inductives:[
 {name:'PAMN55',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PAMN55.leaf',type:C('PAMN55')},{name:'PAMN55.step',type:Pi(Apps(C('IWrapMN55'),[C('PBMN55'),C('BoolMN55.true')]),C('PAMN55'))}]},
 {name:'PBMN55',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PBMN55.back',type:Pi(C('PAMN55'),C('PBMN55'))}]},
]};
{
 const e=env55();for(const d of [Bool,IWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,PAB);const ar=e.get('PAMN55.rec').declaration,hr=e.get('PAMN55.rec_1').declaration;assert.equal(ar.kind,'recursor');assert.equal(hr.kind,'recursor');assert.deepEqual(ar.levelParams,[]);assert.deepEqual(hr.levelParams,[]);assert.deepEqual(ar.metadata.mutual.indexCounts,[0,0,1]);assert.equal(hr.metadata.numIndices,1);
}

// Historical v54 cannot acquire indexed-container mutual/nested semantics by relabeling.
{
 const declarations=[Bool,IBox,AB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-indexed-containers0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-prop0'),/indexed|nested|positive mutual occurrence|constructor field|mutual recursion/i);
 const artifact=makeKernelMutualNestedIndexedContainersArtifact(declarations);assert.equal(artifact.formatVersion,55);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-indexed-containers0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:54}),/unsupported v54 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-prop0'}),/unsupported v55 implementation profile/);
 const historical=makeKernelMutualNestedPropArtifact([Bool,IBox]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/indexed|nested|positive mutual occurrence|constructor field|mutual recursion/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-indexed-container-v55-')),file=path.join(dir,'v55.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-indexed-container-v55-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ninductive IBox (α : Type) : Bool → Type where | mk : α → IBox α true\nmutual\n  inductive A : Type where | leaf : A | step : IBox B true → A\n  inductive B : Type where | back : A → B\nend\n#print A.rec\n#print A.rec_1\ninductive IWrap (P : Prop) : Bool → Prop where | mk : P → IWrap P true\nmutual\n  inductive PA : Prop where | leaf : PA | step : IWrap PB true → PA\n  inductive PB : Prop where | back : PA → PB\nend\n#print PA.rec_1\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/motive_3 : \(a : Bool\) → IBox B a → Sort/);assert.match(gr.stdout,/number of indices: 1/);assert.match(gr.stdout,/motive_3 : \(a : Bool\) → IWrap PB a → Prop/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_INDEXED_CONTAINERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-indexed-containers0',coreFormat:55,status:'accepted',supportedSlice:'one-level Type/Prop mutual+nested graphs whose checked nested container has one recursive parameter plus one-or-more target-independent container indices; mutual target indices remain fixed/shared-parameter-derived',observations:{typeIndexedContainer:'accepted',propIndexedContainer:'accepted',helperIndexTelescope:'preserved',linkedIndexedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v54IndexedMutualNestedContainer:'rejected'},architecturalCorrection:{promotedConstructorLocalPropTargetIndex:'frontend auto-promotion, not a trusted-kernel feature'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v55 indexed nested containers inside Type/Prop mutual graphs, helper index telescopes, linked indexed iota, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
