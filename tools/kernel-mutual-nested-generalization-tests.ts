import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedGeneralizationArtifact,makeKernelDependentIndexedRecursorCompletionArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L1=levelOfNat(1);
const S=level=>({tag:'sort',level}), C=(name,levels=[])=>({tag:'const',name,levels}), B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}), Apps=(fn,args)=>args.reduce(App,fn), Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}), Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const baseOpts={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true};
const env49=()=>new Environment(baseOpts);
const env50=()=>new Environment({...baseOpts,allowMutualNestedGeneralization:true});

const Box={kind:'inductive',name:'BoxMN50',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BoxMN50.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN50'),B(1))))}
]};
const AB={kind:'mutualInductive',name:'ABMN50',levelParams:[],inductives:[
  {name:'AMN50',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'AMN50.leaf',type:C('AMN50')},
    {name:'AMN50.step',type:Pi(App(C('BoxMN50'),C('BMN50')),C('AMN50'))},
  ]},
  {name:'BMN50',type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:'BMN50.back',type:Pi(C('AMN50'),C('BMN50'))},
  ]},
]};

// v49 keeps the campaigns separate; v50 composes them atomically.
{
  const e49=env49();checkAndAddDeclaration(e49,Box);assert.throws(()=>checkAndAddDeclaration(e49,AB),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const e=env50();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,AB);
  for(const name of ['AMN50','BMN50','AMN50.leaf','AMN50.step','BMN50.back','AMN50.rec','BMN50.rec','AMN50.rec_1'])assert.ok(e.has(name),`missing ${name}`);
  assert.equal(e.has('BMN50.rec_1'),false);
  assert.deepEqual(checked.generated,['AMN50.leaf','AMN50.step','BMN50.back','AMN50.rec','BMN50.rec','AMN50.rec_1']);
  const ar=e.get('AMN50.rec').declaration,br=e.get('BMN50.rec').declaration,hr=e.get('AMN50.rec_1').declaration;
  assert.equal(ar.kind,'recursor');assert.equal(br.kind,'recursor');assert.equal(hr.kind,'recursor');
  assert.equal(ar.metadata.mutual.motiveCount,3);assert.deepEqual(ar.metadata.mutual.recursors,['AMN50.rec','BMN50.rec','AMN50.rec_1']);
  assert.match(pretty(ar.type),/BoxMN50\(BMN50\) → Sort/);assert.match(pretty(hr.type),/BoxMN50\.mk\(BMN50/);
  assert.deepEqual(hr.metadata.rules.map(r=>r.ctor),['BoxMN50.mk']);assert.equal(hr.metadata.rules[0].ctorParamCount,1);
}

// Linked iota traverses A.step -> Box helper -> B.back -> A.leaf.
{
  const e=env50();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,AB);
  const N={kind:'axiom',name:'NMN50',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0MN50',levelParams:[],type:C('NMN50')};for(const d of [N,n0])checkAndAddDeclaration(e,d);
  const boxB=App(C('BoxMN50'),C('BMN50'));
  const mA=Lam(C('AMN50'),C('NMN50')),mB=Lam(C('BMN50'),C('NMN50')),mBox=Lam(boxB,C('NMN50'));
  const leaf=C('n0MN50');
  const step=Lam(boxB,Lam(C('NMN50'),B(0)));
  const back=Lam(C('AMN50'),Lam(C('NMN50'),B(0)));
  const mk=Lam(C('BMN50'),Lam(C('NMN50'),B(0)));
  const major=App(C('AMN50.step'),Apps(C('BoxMN50.mk'),[C('BMN50'),App(C('BMN50.back'),C('AMN50.leaf'))]));
  const prefix=[mA,mB,mBox,leaf,step,back,mk];
  const term=Apps(C('AMN50.rec',[L1]),[...prefix,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n0MN50')),`linked mutual+nested iota mismatch: ${pretty(kernelWhnf(e,term))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('NMN50')));
}

// Recursive nested container: helper must recurse into both the mutual element and the container tail.
const List={kind:'inductive',name:'ListMN50',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ListMN50.nil',type:Pi(S(L1),App(C('ListMN50'),B(0)))},
  {name:'ListMN50.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListMN50'),B(1)),App(C('ListMN50'),B(2)))))}
]};
const XY={kind:'mutualInductive',name:'XYMN50',levelParams:[],inductives:[
  {name:'XMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'XMN50.node',type:Pi(App(C('ListMN50'),C('YMN50')),C('XMN50'))}]},
  {name:'YMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'YMN50.back',type:Pi(C('XMN50'),C('YMN50'))}]},
]};
{
  const e=env50();checkAndAddDeclaration(e,List);checkAndAddDeclaration(e,XY);const h=e.get('XMN50.rec_1').declaration;assert.equal(h.kind,'recursor');
  assert.deepEqual(h.metadata.rules.map(r=>r.ctor),['ListMN50.nil','ListMN50.cons']);
  assert.deepEqual(h.metadata.rules[1].recursiveRecursors,['YMN50.rec','XMN50.rec_1']);
}

// Negative variance in the nested container is rechecked in the synthetic mutual block and fails atomically.
{
  const Nat={kind:'axiom',name:'NatMN50',levelParams:[],type:S(L1)};
  const Contra={kind:'inductive',name:'ContraMN50',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'ContraMN50.mk',type:Pi(S(L1),Pi(Pi(B(0),C('NatMN50')),App(C('ContraMN50'),B(1))))}]};
  const Bad={kind:'mutualInductive',name:'BadMN50',levelParams:[],inductives:[
    {name:'BadAMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadAMN50.mk',type:Pi(App(C('ContraMN50'),C('BadBMN50')),C('BadAMN50'))}]},
    {name:'BadBMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadBMN50.mk',type:Pi(C('BadAMN50'),C('BadBMN50'))}]},
  ]};
  const e=env50();checkAndAddDeclaration(e,Nat);checkAndAddDeclaration(e,Contra);assert.throws(()=>checkAndAddDeclaration(e,Bad),/non-positive|positive mutual occurrence|positivity/i);
  for(const n of ['BadAMN50','BadBMN50','BadAMN50.rec','BadBMN50.rec','BadAMN50.rec_1'])assert.equal(e.has(n),false);
}

// Distinct nested specializations become distinct deterministic helpers, while repeated uses share helpers.
{
  const Multi={kind:'mutualInductive',name:'MultiMN50',levelParams:[],inductives:[
    {name:'MultiAMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'MultiAMN50.mk',type:Pi(App(C('BoxMN50'),C('MultiAMN50')),Pi(App(C('BoxMN50'),C('MultiBMN50')),C('MultiAMN50')))}]},
    {name:'MultiBMN50',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'MultiBMN50.mk',type:Pi(C('MultiAMN50'),C('MultiBMN50'))}]},
  ]};
  const e=env50();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Multi);
  assert.ok(e.has('MultiAMN50.rec_1'));assert.ok(e.has('MultiAMN50.rec_2'));assert.equal(e.has('MultiAMN50.rec_3'),false);
  assert.equal(e.get('MultiAMN50.rec').declaration.metadata.mutual.motiveCount,4);
  assert.match(pretty(e.get('MultiAMN50.rec_1').declaration.type),/BoxMN50\(MultiAMN50\)/);
  assert.match(pretty(e.get('MultiAMN50.rec_2').declaration.type),/BoxMN50\(MultiBMN50\)/);
  assert.deepEqual(checked.generated,['MultiAMN50.mk','MultiBMN50.mk','MultiAMN50.rec','MultiBMN50.rec','MultiAMN50.rec_1','MultiAMN50.rec_2']);
}

// Strict Core v50 serialization/replay and v49 isolation.
{
  const declarations=[Box,AB];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-generalization0').status,'accepted');
  assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-dependent-indexed-recursor-completion0'),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const artifact=makeKernelMutualNestedGeneralizationArtifact(declarations);assert.equal(artifact.formatVersion,50);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-generalization0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:49}),/unsupported v49 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-dependent-indexed-recursor-completion0'}),/unsupported v50 implementation profile/);
  const historical=makeKernelDependentIndexedRecursorCompletionArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|constructor field|positive/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-v50-')),file=path.join(dir,'v50.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 oracle: three motives, one A.rec_1 helper, recursive-container acceptance, and negative variance rejection.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-v50-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A : Type where | leaf : A | step : Box B → A\n  inductive B : Type where | back : A → B\nend\n#print A.rec\n#print B.rec\n#check A.rec_1\nmutual\n  inductive MA : Type where | both : Box MA → Box MB → MA\n  inductive MB : Type where | back : MA → MB\nend\n#check MA.rec_1\n#check MA.rec_2\ninductive MyList (α : Type) : Type where | nil : MyList α | cons : α → MyList α → MyList α\nmutual\n  inductive X : Type where | node : MyList Y → X\n  inductive Y : Type where | back : X → Y\nend\n#check X.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/motive_3 : Box B → Sort/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/MA\.rec_1/);assert.match(gr.stdout,/MA\.rec_2/);assert.match(gr.stdout,/motive_3 : MyList Y → Sort|X\.rec_1/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Contra (α : Type) : Type where | mk : (α → Nat) → Contra α\nmutual\n  inductive A : Type where | mk : Contra B → A\n  inductive B : Type where | mk : A → B\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/non positive occurrence|non-positive occurrence|positive/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_GENERALIZATION_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-generalization0',coreFormat:50,status:'accepted',supportedSlice:'monomorphic parameterless/indexless mutual Type blocks with any finite set of one-level recursive specializations through already checked monomorphic one-parameter zero-index Type containers; identical specializations deduplicate and distinct specializations receive deterministic helper motives/recursors',observations:{boxMutualNestedAdmission:'accepted',threeMotiveRecursorFamily:'accepted',firstMemberLinkedHelper:'accepted',multipleDistinctSpecializations:'accepted',deduplicatedHelperGraph:'accepted',linkedIota:'accepted',recursiveListContainer:'accepted',negativeContainerVariance:'rejected',serializedReplay:'accepted'},historicalIsolation:{v49MutualNested:'rejected'},explicitGaps:{mutualParametersOrIndicesWithNesting:'unsupported',polymorphicMutualNested:'unsupported',nestedMutualProp:'unsupported',deeperMutualNestedGraph:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v50 bounded mutual+nested preprocessing, linked helper recursors/iota, recursive-container traversal, variance rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
