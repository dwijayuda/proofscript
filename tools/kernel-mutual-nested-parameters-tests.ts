import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedParametersArtifact,makeKernelMutualNestedGeneralizationArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L1=levelOfNat(1);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true};
const env50=()=>new Environment(baseOpts);
const env51=()=>new Environment({...baseOpts,allowMutualNestedParameters:true});

const Box={kind:'inductive',name:'BoxMN51',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BoxMN51.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN51'),B(1))))}
]};
const ParamAB={kind:'mutualInductive',name:'ParamABMN51',levelParams:[],inductives:[
  {name:'AMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'AMN51.leaf',type:Pi(S(L1),App(C('AMN51'),B(0)))},
    {name:'AMN51.step',type:Pi(S(L1),Pi(App(C('BoxMN51'),App(C('BMN51'),B(0))),App(C('AMN51'),B(1))))},
  ]},
  {name:'BMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:'BMN51.back',type:Pi(S(L1),Pi(App(C('AMN51'),B(0)),App(C('BMN51'),B(1))))},
  ]},
]};

// v50 keeps parameterized mutual+nested unsupported; v51 composes the two trusted campaigns.
{
  const e50=env50();checkAndAddDeclaration(e50,Box);assert.throws(()=>checkAndAddDeclaration(e50,ParamAB),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const e=env51();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,ParamAB);
  for(const n of ['AMN51','BMN51','AMN51.leaf','AMN51.step','BMN51.back','AMN51.rec','BMN51.rec','AMN51.rec_1'])assert.ok(e.has(n),`missing ${n}`);
  assert.deepEqual(checked.generated,['AMN51.leaf','AMN51.step','BMN51.back','AMN51.rec','BMN51.rec','AMN51.rec_1']);
  const ar=e.get('AMN51.rec').declaration,hr=e.get('AMN51.rec_1').declaration;assert.equal(ar.kind,'recursor');assert.equal(hr.kind,'recursor');
  assert.equal(ar.metadata.numParams,1);assert.equal(ar.metadata.mutual.motiveCount,3);assert.deepEqual(ar.metadata.mutual.recursors,['AMN51.rec','BMN51.rec','AMN51.rec_1']);
  assert.match(pretty(ar.type),/BoxMN51\(BMN51\(x0\)\)/);assert.match(pretty(hr.type),/BoxMN51\(BMN51\(x0\)\)/);
}

// Linked iota carries the shared parameter through A.step -> Box helper -> B.back -> A.leaf.
{
  const Alpha={kind:'axiom',name:'AlphaMN51',levelParams:[],type:S(L1)},Out={kind:'axiom',name:'OutMN51',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MN51',levelParams:[],type:C('OutMN51')};
  const e=env51();for(const d of [Box,Alpha,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamAB);
  const a=C('AlphaMN51'),aTy=App(C('AMN51'),a),bTy=App(C('BMN51'),a),boxB=App(C('BoxMN51'),bTy);
  const mA=Lam(aTy,C('OutMN51')),mB=Lam(bTy,C('OutMN51')),mBox=Lam(boxB,C('OutMN51'));
  const leaf=C('out0MN51'),step=Lam(boxB,Lam(C('OutMN51'),B(0))),back=Lam(aTy,Lam(C('OutMN51'),B(0))),mk=Lam(bTy,Lam(C('OutMN51'),B(0)));
  const major=Apps(C('AMN51.step'),[a,Apps(C('BoxMN51.mk'),[bTy,Apps(C('BMN51.back'),[a,App(C('AMN51.leaf'),a)])])]);
  const term=Apps(C('AMN51.rec',[L1]),[a,mA,mB,mBox,leaf,step,back,mk,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('out0MN51')),`parameterized linked iota mismatch: ${pretty(kernelWhnf(e,term))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('OutMN51')));
}

// Genuinely dependent shared parameters: (α : Type) (x : α).
const DepAB={kind:'mutualInductive',name:'DepABMN51',levelParams:[],inductives:[
  {name:'DAMN51',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
    {name:'DAMN51.step',type:Pi(S(L1),Pi(B(0),Pi(App(C('BoxMN51'),Apps(C('DBMN51'),[B(1),B(0)])),Apps(C('DAMN51'),[B(2),B(1)]))))},
  ]},
  {name:'DBMN51',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
    {name:'DBMN51.back',type:Pi(S(L1),Pi(B(0),Pi(Apps(C('DAMN51'),[B(1),B(0)]),Apps(C('DBMN51'),[B(2),B(1)]))))},
  ]},
]};
{
  const e=env51();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,DepAB);
  for(const n of ['DAMN51','DBMN51','DAMN51.rec','DBMN51.rec','DAMN51.rec_1'])assert.ok(e.has(n),`missing ${n}`);
  assert.ok(checked.generated.includes('DAMN51.rec_1'));
  const r=e.get('DAMN51.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.mutual.motiveCount,3);
  const text=pretty(r.type);assert.match(text,/\{x0: Type\}/);assert.match(text,/\{x1: x0\}/);assert.match(text,/BoxMN51\(DBMN51\(x0, x1\)\)/);
}

// Multiple distinct parameterized nested targets create deterministic helper recursors.
{
  const Multi={kind:'mutualInductive',name:'MultiMN51',levelParams:[],inductives:[
    {name:'MAMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'MAMN51.mk',type:Pi(S(L1),Pi(App(C('BoxMN51'),App(C('MAMN51'),B(0))),Pi(App(C('BoxMN51'),App(C('MBMN51'),B(1))),App(C('MAMN51'),B(2)))))}]},
    {name:'MBMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'MBMN51.back',type:Pi(S(L1),Pi(App(C('MAMN51'),B(0)),App(C('MBMN51'),B(1))))}]},
  ]};
  const e=env51();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Multi);
  assert.ok(e.has('MAMN51.rec_1'));assert.ok(e.has('MAMN51.rec_2'));assert.equal(e.has('MAMN51.rec_3'),false);assert.equal(e.get('MAMN51.rec').declaration.metadata.mutual.motiveCount,4);
  assert.deepEqual(checked.generated,['MAMN51.mk','MBMN51.back','MAMN51.rec','MBMN51.rec','MAMN51.rec_1','MAMN51.rec_2']);
}

// Non-uniform nested target parameters must fail atomically via the trusted mutual uniformity check.
{
  const Nat={kind:'axiom',name:'NatMN51',levelParams:[],type:S(L1)};
  const Bad={kind:'mutualInductive',name:'BadMN51',levelParams:[],inductives:[
    {name:'BadAMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BadAMN51.mk',type:Pi(S(L1),Pi(App(C('BoxMN51'),App(C('BadBMN51'),C('NatMN51'))),App(C('BadAMN51'),B(1))))}]},
    {name:'BadBMN51',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BadBMN51.mk',type:Pi(S(L1),App(C('BadBMN51'),B(0)))}]},
  ]};
  const e=env51();for(const d of [Box,Nat])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/parameter|uniform|definitionally equal|fixed/i);
  for(const n of ['BadAMN51','BadBMN51','BadAMN51.rec','BadBMN51.rec','BadAMN51.rec_1'])assert.equal(e.has(n),false);
}

// Core v51 serialization/replay and strict v50 semantic isolation.
{
  const declarations=[Box,ParamAB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-generalization0'),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const artifact=makeKernelMutualNestedParametersArtifact(declarations);assert.equal(artifact.formatVersion,51);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-parameters0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:50}),/unsupported v50 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-generalization0'}),/unsupported v51 implementation profile/);
  const historical=makeKernelMutualNestedGeneralizationArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-param-v51-')),file=path.join(dir,'v51.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1: shared/dependent parameters are threaded through helper recursors; non-uniform nested target is rejected.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-param-v51-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A (α : Type) : Type where | step : Box (B α) → A α\n  inductive B (α : Type) : Type where | back : A α → B α\nend\n#print A.rec\n#check A.rec_1\nmutual\n  inductive DA (α : Type) (x : α) : Type where | step : Box (DB α x) → DA α x\n  inductive DB (α : Type) (x : α) : Type where | back : DA α x → DB α x\nend\n#print DA.rec\n#check DA.rec_1\nmutual\n  inductive MA (α : Type) : Type where | both : Box (MA α) → Box (MB α) → MA α\n  inductive MB (α : Type) : Type where | back : MA α → MB α\nend\n#check MA.rec_1\n#check MA.rec_2\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/\{α : Type\}/);assert.match(gr.stdout,/motive_3 : Box \(B α\) → Sort/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/\{x : α\}/);assert.match(gr.stdout,/DA\.rec_1/);assert.match(gr.stdout,/MA\.rec_1/);assert.match(gr.stdout,/MA\.rec_2/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A (α : Type) : Type where | bad : Box (B Nat) → A α\n  inductive B (α : Type) : Type where | mk : B α\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Mismatched inductive type parameter|not definitionally equal|parameter/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-parameters0',coreFormat:51,status:'accepted',supportedSlice:'v50 monomorphic one-level mutual+nested helper graph extended through shared uniform parameter telescopes, including genuinely dependent parameters; zero outer indices and monomorphic nested containers remain required',observations:{sharedParameterMutualNested:'accepted',dependentSharedParameters:'accepted',parameterizedHelperRecursor:'accepted',multipleParameterizedHelpers:'accepted',linkedParameterizedIota:'accepted',nonUniformNestedTarget:'rejected',serializedReplay:'accepted'},historicalIsolation:{v50ParameterizedMutualNested:'rejected'},explicitGaps:{mutualIndicesWithNesting:'unsupported',polymorphicMutualNested:'unsupported',mutualNestedProp:'unsupported',deeperMutualNestedGraph:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v51 shared/dependent-parameter mutual+nested graph, helper recursors/iota, uniformity rejection, replay, v50 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
