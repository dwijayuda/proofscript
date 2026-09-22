import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperIndicesArtifact,makeKernelMutualNestedDeeperParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true};
const env57=()=>new Environment(base),env58=()=>new Environment({...base,allowMutualNestedDeeperIndices:true});

const Nat={kind:'axiom',name:'NatMN58',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroMN58',levelParams:[],type:C('NatMN58')};
const one={kind:'axiom',name:'oneMN58',levelParams:[],type:C('NatMN58')};
const Box={kind:'inductive',name:'BoxMN58',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxMN58.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN58'),B(1))))}]};
const DeepIdx={kind:'mutualInductive',name:'DeepIdxMN58',levelParams:[],inductives:[
 {name:'AMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'AMN58.leaf',type:App(C('AMN58'),C('zeroMN58'))},
  {name:'AMN58.step',type:Pi(C('NatMN58'),Pi(App(C('BoxMN58'),App(C('BoxMN58'),App(C('BMN58'),C('zeroMN58')))),App(C('AMN58'),B(1))))},
 ]},
 {name:'BMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'BMN58.back',type:Pi(C('NatMN58'),Pi(App(C('AMN58'),B(0)),App(C('BMN58'),B(1))))},
 ]},
]};

// v58 retains original outer indices and creates two fixed-specialization helpers.
{
 const old=env57();for(const d of [Nat,zero,Box])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,DeepIdx),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const e=env58();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,DeepIdx);
 for(const n of ['AMN58.rec','BMN58.rec','AMN58.rec_1','AMN58.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN58.rec_3'),false);
 assert.equal(e.get('AMN58').declaration.numIndices,1);assert.equal(e.get('BMN58').declaration.numIndices,1);
 const ar=e.get('AMN58.rec').declaration,h1=e.get('AMN58.rec_1').declaration,h2=e.get('AMN58.rec_2').declaration;
 assert.equal(ar.kind,'recursor');assert.equal(h1.kind,'recursor');assert.equal(h2.kind,'recursor');
 assert.equal(ar.metadata.numParams,0);assert.equal(ar.metadata.numIndices,1);assert.equal(ar.metadata.mutual.motiveCount,4);assert.deepEqual(ar.metadata.mutual.indexCounts,[1,1,0,0]);
 assert.match(pretty(ar.type),/BoxMN58\(BoxMN58\(BMN58\(zeroMN58\)\)\)/);assert.match(pretty(h2.type),/BoxMN58\(BMN58\(zeroMN58\)\)/);
 assert.deepEqual(checked.generated,['AMN58.leaf','AMN58.step','BMN58.back','AMN58.rec','BMN58.rec','AMN58.rec_1','AMN58.rec_2']);
}

// Actual indexed deep iota: A.step 0 -> helper1 -> helper2 -> B.back 0 -> A.leaf.
{
 const Out={kind:'axiom',name:'OutMN58',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MN58',levelParams:[],type:C('OutMN58')};
 const e=env58();for(const d of [Nat,zero,Box,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,DeepIdx);
 const n=C('NatMN58'),z=C('zeroMN58'),a0=App(C('AMN58'),z),b0=App(C('BMN58'),z),boxB=App(C('BoxMN58'),b0),boxboxB=App(C('BoxMN58'),boxB),out=C('OutMN58');
 const args=[
  Lam(n,Lam(App(C('AMN58'),B(0)),out)),
  Lam(n,Lam(App(C('BMN58'),B(0)),out)),
  Lam(boxboxB,out),Lam(boxB,out),
  C('out0MN58'),
  Lam(n,Lam(boxboxB,Lam(out,B(0)))),
  Lam(n,Lam(App(C('AMN58'),B(0)),Lam(out,B(0)))),
  Lam(boxB,Lam(out,B(0))),
  Lam(b0,Lam(out,B(0))),
 ];
 const major=Apps(C('AMN58.step'),[z,Apps(C('BoxMN58.mk'),[boxB,Apps(C('BoxMN58.mk'),[b0,Apps(C('BMN58.back'),[z,C('AMN58.leaf')])])])]);
 const term=Apps(C('AMN58.rec',[L1]),[...args,z,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0MN58')),`v58 linked indexed iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Shared-parameter-derived target index composes with varying direct recursive indices.
{
 const Param={kind:'mutualInductive',name:'ParamDeepIdxMN58',levelParams:[],inductives:[
  {name:'PAMN58',type:Pi(C('NatMN58'),Pi(C('NatMN58'),S(L1))),numParams:1,numIndices:1,constructors:[
   {name:'PAMN58.step',type:Pi(C('NatMN58'),Pi(C('NatMN58'),Pi(App(C('BoxMN58'),App(C('BoxMN58'),Apps(C('PBMN58'),[B(1),B(1)]))),Apps(C('PAMN58'),[B(2),B(1)]))))},
  ]},
  {name:'PBMN58',type:Pi(C('NatMN58'),Pi(C('NatMN58'),S(L1))),numParams:1,numIndices:1,constructors:[
   {name:'PBMN58.back',type:Pi(C('NatMN58'),Pi(C('NatMN58'),Pi(Apps(C('PAMN58'),[B(1),B(0)]),Apps(C('PBMN58'),[B(2),B(1)]))))},
  ]},
 ]};
 const e=env58();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Param);const r=e.get('PAMN58.rec').declaration;
 assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);assert.match(pretty(r.type),/BoxMN58\(BoxMN58\(PBMN58\(x0, x0\)\)\)/);
}

// Constructor-local target index capture remains forbidden, while direct B.back n stays legal.
{
 const Bad={kind:'mutualInductive',name:'BadDeepIdxMN58',levelParams:[],inductives:[
  {name:'BadAMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BadAMN58.step',type:Pi(C('NatMN58'),Pi(App(C('BoxMN58'),App(C('BoxMN58'),App(C('BadBMN58'),B(0)))),App(C('BadAMN58'),B(1))))}]},
  {name:'BadBMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'BadBMN58.base',type:Pi(C('NatMN58'),App(C('BadBMN58'),B(0)))}]},
 ]};
 const e=env58();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/may not capture constructor\/index-local|nested mutual target|local/i);for(const n of ['BadAMN58','BadBMN58','BadAMN58.rec_1'])assert.equal(e.has(n),false);
}

// Depth three generates three helpers while retaining original index counts.
{
 const D3={kind:'mutualInductive',name:'D3DeepIdxMN58',levelParams:[],inductives:[
  {name:'D3AMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'D3AMN58.step',type:Pi(C('NatMN58'),Pi(App(C('BoxMN58'),App(C('BoxMN58'),App(C('BoxMN58'),App(C('D3BMN58'),C('zeroMN58'))))),App(C('D3AMN58'),B(1))))}]},
  {name:'D3BMN58',type:Pi(C('NatMN58'),S(L1)),numParams:0,numIndices:1,constructors:[{name:'D3BMN58.back',type:Pi(C('NatMN58'),Pi(App(C('D3AMN58'),B(0)),App(C('D3BMN58'),B(1))))}]},
 ]};
 const e=env58();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,D3);const r=e.get('D3AMN58.rec').declaration;assert.equal(r.metadata.mutual.motiveCount,5);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0,0]);for(const n of ['D3AMN58.rec_1','D3AMN58.rec_2','D3AMN58.rec_3'])assert.ok(e.has(n));
}

// Strict Core v58 replay and frozen v57 isolation.
{
 const declarations=[Nat,zero,Box,DeepIdx];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-indices0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-parameters0'),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const artifact=makeKernelMutualNestedDeeperIndicesArtifact(declarations);assert.equal(artifact.formatVersion,58);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-indices0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:57}),/unsupported v57 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-parameters0'}),/unsupported v58 implementation profile/);
 const historical=makeKernelMutualNestedDeeperParametersArtifact([Nat,zero,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-idx-v58-')),file=path.join(dir,'v58.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatMN58','zeroMN58']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-idx-v58-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A : Nat → Type where | leaf : A 0 | step (n : Nat) : Box (Box (B 0)) → A n\n  inductive B : Nat → Type where | back (n : Nat) : A n → B n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n#print B.rec\nmutual\n  inductive PA (k : Nat) : Nat → Type where | step (n : Nat) : Box (Box (PB k k)) → PA k n\n  inductive PB (k : Nat) : Nat → Type where | back (n : Nat) : PA k n → PB k n\nend\n#print PA.rec\n#check PA.rec_2\nmutual\n  inductive D3A : Nat → Type where | step (n : Nat) : Box (Box (Box (D3B 0))) → D3A n\n  inductive D3B : Nat → Type where | back (n : Nat) : D3A n → D3B n\nend\n#print D3A.rec\n#check D3A.rec_3\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of indices: 1/);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/A\.rec_2/);assert.match(gr.stdout,/Box \(Box \(B/);assert.match(gr.stdout,/PB k k/);assert.match(gr.stdout,/number of motives: 5/);assert.match(gr.stdout,/D3A\.rec_3/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where | mk : α → Box α\nset_option inductive.autoPromoteIndices false in\nmutual\n  inductive A : Nat → Type where | step (n : Nat) : Box (Box (B n)) → A n\n  inductive B : Nat → Type where | mk (n : Nat) : B n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_INDICES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-indices0',coreFormat:58,status:'accepted',supportedSlice:'monomorphic Type mutual blocks with shared/dependent uniform parameters and per-member outer indices; exactly one linear deep nested path of arbitrary finite depth >=2 through monomorphic one-parameter zero-index containers; deep target indices must project to closed/shared-parameter context',observations:{fixedDeepTargetIndex:'accepted',parameterDerivedDeepTargetIndex:'accepted',outerIndexTelescopesPreserved:'accepted',depth2HelperOrder:'accepted',depth3HelperOrder:'accepted',linkedIndexedDeepIota:'accepted',directVaryingIndexRecursion:'accepted',localDeepTargetIndexCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v57DeepIndexedMutualNested:'rejected'},explicitGaps:{polymorphicDeepIndexedMutualNested:'unsupported',deepIndexedMutualNestedProp:'unsupported',multipleDeepFields:'unsupported',indexedOrDependentDeepContainers:'unsupported',localDeepTargetIndexCapture:'Lean-rejected'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v58 arbitrary-depth indexed mutual+nested helper chains, fixed/parameter-derived deep target indices, linked iota, locality rejection, replay, v57 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
