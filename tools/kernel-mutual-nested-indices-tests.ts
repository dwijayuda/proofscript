import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedIndicesArtifact,makeKernelMutualNestedParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L1=levelOfNat(1);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Pis=(domains,body)=>domains.reduceRight((out,domain)=>Pi(domain,out),body);
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true};
const env51=()=>new Environment(baseOpts); const env52=()=>new Environment({...baseOpts,allowMutualNestedIndices:true});

const Nat={kind:'axiom',name:'NatMN52',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroMN52',levelParams:[],type:C('NatMN52')};
const one={kind:'axiom',name:'oneMN52',levelParams:[],type:C('NatMN52')};
const Box={kind:'inductive',name:'BoxMN52',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BoxMN52.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN52'),B(1))))}
]};
const AB={kind:'mutualInductive',name:'ABMN52',levelParams:[],inductives:[
  {name:'AMN52',type:Pi(S(L1),Pi(C('NatMN52'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'AMN52.leaf',type:Pi(S(L1),Pi(C('NatMN52'),Apps(C('AMN52'),[B(1),B(0)])))},
    {name:'AMN52.step',type:Pi(S(L1),Pi(C('NatMN52'),Pi(App(C('BoxMN52'),Apps(C('BMN52'),[B(1),C('zeroMN52')])),Apps(C('AMN52'),[B(2),B(1)]))))},
  ]},
  {name:'BMN52',type:Pi(S(L1),Pi(C('NatMN52'),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:'BMN52.back',type:Pi(S(L1),Pi(C('NatMN52'),Pi(Apps(C('AMN52'),[B(1),B(0)]),Apps(C('BMN52'),[B(2),B(1)]))))},
  ]},
]};

// Fixed nested target index while original families retain one index each.
{
  const e=env52();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,AB);
  for(const n of ['AMN52','BMN52','AMN52.rec','BMN52.rec','AMN52.rec_1'])assert.ok(e.has(n),`missing ${n}`);
  assert.equal(e.get('AMN52').declaration.numIndices,1);assert.equal(e.get('BMN52').declaration.numIndices,1);
  const ar=e.get('AMN52.rec').declaration,hr=e.get('AMN52.rec_1').declaration;assert.equal(ar.kind,'recursor');assert.equal(hr.kind,'recursor');
  assert.equal(ar.metadata.numParams,1);assert.equal(ar.metadata.numIndices,1);assert.equal(ar.metadata.mutual.motiveCount,3);assert.deepEqual(ar.metadata.mutual.indexCounts,[1,1,0]);
  assert.match(pretty(ar.type),/BoxMN52\(BMN52\(x0, zeroMN52\)\)/);assert.match(pretty(hr.type),/BoxMN52\(BMN52\(x0, zeroMN52\)\)/);
  assert.deepEqual(checked.generated,['AMN52.leaf','AMN52.step','BMN52.back','AMN52.rec','BMN52.rec','AMN52.rec_1']);
}

// Two definitionally distinct fixed specializations produce two deterministic helpers.
{
  const Multi={kind:'mutualInductive',name:'MultiMN52',levelParams:[],inductives:[
    {name:'MAMN52',type:Pi(S(L1),Pi(C('NatMN52'),S(L1))),numParams:1,numIndices:1,constructors:[
      {name:'MAMN52.mk',type:Pi(S(L1),Pi(C('NatMN52'),Pi(App(C('BoxMN52'),Apps(C('MBMN52'),[B(1),C('zeroMN52')])),Pi(App(C('BoxMN52'),Apps(C('MBMN52'),[B(2),C('oneMN52')])),Apps(C('MAMN52'),[B(3),B(2)])))))}
    ]},
    {name:'MBMN52',type:Pi(S(L1),Pi(C('NatMN52'),S(L1))),numParams:1,numIndices:1,constructors:[{name:'MBMN52.base',type:Pi(S(L1),Pi(C('NatMN52'),Apps(C('MBMN52'),[B(1),B(0)])))}]},
  ]};
  const e=env52();for(const d of [Nat,zero,one,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Multi);
  assert.ok(e.has('MAMN52.rec_1'));assert.ok(e.has('MAMN52.rec_2'));assert.equal(e.has('MAMN52.rec_3'),false);assert.equal(e.get('MAMN52.rec').declaration.metadata.mutual.motiveCount,4);assert.deepEqual(e.get('MAMN52.rec').declaration.metadata.mutual.indexCounts,[1,1,0,0]);
  assert.ok(checked.generated.includes('MAMN52.rec_2'));
}

// Shared parameter-derived nested target index is allowed.
{
  const ParamIdx={kind:'mutualInductive',name:'ParamIdxMN52',levelParams:[],inductives:[
    {name:'PAMN52',type:Pis([S(L1),C('NatMN52'),C('NatMN52')],S(L1)),numParams:2,numIndices:1,constructors:[
      {name:'PAMN52.step',type:Pis([S(L1),C('NatMN52'),C('NatMN52'),App(C('BoxMN52'),Apps(C('PBMN52'),[B(2),B(1),C('zeroMN52')]))],Apps(C('PAMN52'),[B(3),B(2),B(1)]))}
    ]},
    {name:'PBMN52',type:Pis([S(L1),C('NatMN52'),C('NatMN52')],S(L1)),numParams:2,numIndices:1,constructors:[
      {name:'PBMN52.back',type:Pis([S(L1),C('NatMN52'),C('NatMN52'),Apps(C('PAMN52'),[B(2),B(1),B(0)])],Apps(C('PBMN52'),[B(3),B(2),B(1)]))}
    ]},
  ]};
  const e=env52();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamIdx);
  const r=e.get('PAMN52.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0]);assert.ok(e.has('PAMN52.rec_1'));
}

// Constructor/index-local nested target indices are forbidden, matching Lean.
{
  const Bad={kind:'mutualInductive',name:'BadLocalMN52',levelParams:[],inductives:[
    {name:'BadAMN52',type:Pis([S(L1),C('NatMN52')],S(L1)),numParams:1,numIndices:1,constructors:[
      {name:'BadAMN52.step',type:Pis([S(L1),C('NatMN52'),App(C('BoxMN52'),Apps(C('BadBMN52'),[B(1),B(0)]))],Apps(C('BadAMN52'),[B(2),B(1)]))}
    ]},
    {name:'BadBMN52',type:Pis([S(L1),C('NatMN52')],S(L1)),numParams:1,numIndices:1,constructors:[{name:'BadBMN52.base',type:Pis([S(L1),C('NatMN52')],Apps(C('BadBMN52'),[B(1),B(0)]))}]},
  ]};
  const e=env52();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/depend only on shared mutual parameters|local variables|nested mutual target indices/i);
  for(const n of ['BadAMN52','BadBMN52','BadAMN52.rec','BadAMN52.rec_1'])assert.equal(e.has(n),false);
}

// v52 serialization/replay and v51 isolation.
{
  const declarations=[Nat,zero,Box,AB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-indices0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-parameters0'),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const artifact=makeKernelMutualNestedIndicesArtifact(declarations);assert.equal(artifact.formatVersion,52);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-indices0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:51}),/unsupported v51 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-parameters0'}),/unsupported v52 implementation profile/);
  const historical=makeKernelMutualNestedParametersArtifact([Nat,zero,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-idx-v52-')),file=path.join(dir,'v52.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatMN52','zeroMN52']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-idx-v52-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A (α : Type) : Nat → Type where\n    | leaf (n : Nat) : A α n\n    | step (n : Nat) : Box (B α 0) → A α n\n  inductive B (α : Type) : Nat → Type where\n    | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#check A.rec_1\nmutual\n  inductive PA (α : Type) (k : Nat) : Nat → Type where\n    | step (n : Nat) : Box (PB α k 0) → PA α k n\n  inductive PB (α : Type) (k : Nat) : Nat → Type where\n    | back (n : Nat) : PA α k n → PB α k n\nend\n#print PA.rec\n#check PA.rec_1\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of indices: 1/);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/Box \(B α/);assert.match(gr.stdout,/PA\.rec_1/);assert.match(gr.stdout,/PB α k/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where | mk : α → Box α\nset_option inductive.autoPromoteIndices false in\nmutual\n  inductive A (α : Type) : Nat → Type where\n    | step (n : Nat) : Box (B α n) → A α n\n  inductive B (α : Type) : Nat → Type where | mk (n : Nat) : B α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/nested inductive datatypes parameters cannot contain local variables/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_INDICES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-indices0',coreFormat:52,status:'accepted',supportedSlice:'monomorphic Type-valued indexed mutual families with shared uniform parameters; one-level monomorphic Type->Type nested containers; nested target indices must project to closed/shared-parameter context',observations:{fixedTargetIndex:'accepted',parameterDerivedTargetIndex:'accepted',perMemberIndexTelescopes:'accepted',multipleFixedSpecializations:'accepted',helperRecursor:'accepted',localIndexCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v51IndexedMutualNested:'rejected'},explicitGaps:{polymorphicMutualNested:'unsupported',mutualNestedProp:'unsupported',deeperMutualNestedGraph:'unsupported',indexedNestedContainers:'unsupported',localIndexCapture:'Lean-rejected'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v52 indexed mutual+nested fixed/parameter-derived target indices, helper graph, replay, v51 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
