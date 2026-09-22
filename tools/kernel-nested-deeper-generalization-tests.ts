import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperGeneralizationArtifact,makeKernelNestedDeeperArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true};
const env38=()=>new Environment({...base,allowNestedDeeperGeneralization:true}),env37=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxND38',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BoxND38.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxND38'),B(1))))}
]};
const Tree3={kind:'inductive',name:'Tree3ND38',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'Tree3ND38.leaf',type:C('Tree3ND38')},
  {name:'Tree3ND38.node',type:Pi(App(C('BoxND38'),App(C('BoxND38'),App(C('BoxND38'),C('Tree3ND38')))),C('Tree3ND38'))}
]};

// Depth 3 Box chain: four motives/recursors and actual rec_1 -> rec_2 -> rec_3 -> rec iota.
{
  const e=env38();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree3);
  assert.deepEqual(checked.generated,['Tree3ND38.leaf','Tree3ND38.node','Tree3ND38.rec','Tree3ND38.rec_1','Tree3ND38.rec_2','Tree3ND38.rec_3']);
  const r=e.get('Tree3ND38.rec').declaration,h1=e.get('Tree3ND38.rec_1').declaration,h2=e.get('Tree3ND38.rec_2').declaration,h3=e.get('Tree3ND38.rec_3').declaration;
  assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0,0]);assert.equal(r.metadata.mutual.motiveCount,4);
  assert.deepEqual(h1.metadata.rules[0].recursiveRecursors,['Tree3ND38.rec_2']);
  assert.deepEqual(h2.metadata.rules[0].recursiveRecursors,['Tree3ND38.rec_3']);
  assert.deepEqual(h3.metadata.rules[0].recursiveRecursors,['Tree3ND38.rec']);
  const Out={kind:'axiom',name:'OutND38',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0ND38',levelParams:[],type:C('OutND38')};for(const d of [Out,out0])checkAndAddDeclaration(e,d);
  const t=C('Tree3ND38'),b1=App(C('BoxND38'),t),b2=App(C('BoxND38'),b1),b3=App(C('BoxND38'),b2),out=C('OutND38');
  const motives=[Lam(t,out),Lam(b3,out),Lam(b2,out),Lam(b1,out)];
  const minors=[C('out0ND38'),Lam(b3,Lam(out,B(0))),Lam(b2,Lam(out,B(0))),Lam(b1,Lam(out,B(0))),Lam(t,Lam(out,B(0)))];
  const leaf=C('Tree3ND38.leaf'),inner=Apps(C('BoxND38.mk'),[t,leaf]),middle=Apps(C('BoxND38.mk'),[b1,inner]),outer=Apps(C('BoxND38.mk'),[b2,middle]),major=App(C('Tree3ND38.node'),outer);
  const term=Apps(C('Tree3ND38.rec',[L1]),[...motives,...minors,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0ND38')),`depth3 Box iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

const List={kind:'inductive',name:'ListND38',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ListND38.nil',type:Pi(S(L1),App(C('ListND38'),B(0)))},
  {name:'ListND38.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListND38'),B(1)),App(C('ListND38'),B(2)))))}
]};
const TreeL3={kind:'inductive',name:'TreeL3ND38',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeL3ND38.leaf',type:C('TreeL3ND38')},
  {name:'TreeL3ND38.node',type:Pi(App(C('ListND38'),App(C('ListND38'),App(C('ListND38'),C('TreeL3ND38')))),C('TreeL3ND38'))}
]};

// Recursive List^3: each layer recurses inward on head and on itself for tail, with fields-first IHs.
{
  const e=env38();checkAndAddDeclaration(e,List);checkAndAddDeclaration(e,TreeL3);
  const h1=e.get('TreeL3ND38.rec_1').declaration,h2=e.get('TreeL3ND38.rec_2').declaration,h3=e.get('TreeL3ND38.rec_3').declaration;
  assert.deepEqual(h1.metadata.rules[1].recursiveRecursors,['TreeL3ND38.rec_2','TreeL3ND38.rec_1']);
  assert.deepEqual(h2.metadata.rules[1].recursiveRecursors,['TreeL3ND38.rec_3','TreeL3ND38.rec_2']);
  assert.deepEqual(h3.metadata.rules[1].recursiveRecursors,['TreeL3ND38.rec','TreeL3ND38.rec_3']);
  const Out={kind:'axiom',name:'OutLND38',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0LND38',levelParams:[],type:C('OutLND38')};for(const d of [Out,out0])checkAndAddDeclaration(e,d);
  const t=C('TreeL3ND38'),l1=App(C('ListND38'),t),l2=App(C('ListND38'),l1),l3=App(C('ListND38'),l2),out=C('OutLND38');
  const motives=[Lam(t,out),Lam(l3,out),Lam(l2,out),Lam(l1,out)];
  const cons3=Lam(l2,Lam(l3,Lam(out,Lam(out,B(1))))),cons2=Lam(l1,Lam(l2,Lam(out,Lam(out,B(1))))),cons1=Lam(t,Lam(l1,Lam(out,Lam(out,B(1)))));
  const minors=[C('out0LND38'),Lam(l3,Lam(out,B(0))),C('out0LND38'),cons3,C('out0LND38'),cons2,C('out0LND38'),cons1];
  const leaf=C('TreeL3ND38.leaf'),nil1=App(C('ListND38.nil'),t),one=Apps(C('ListND38.cons'),[t,leaf,nil1]),nil2=App(C('ListND38.nil'),l1),two=Apps(C('ListND38.cons'),[l1,one,nil2]),nil3=App(C('ListND38.nil'),l2),three=Apps(C('ListND38.cons'),[l2,two,nil3]),major=App(C('TreeL3ND38.node'),three);
  const term=Apps(C('TreeL3ND38.rec',[L1]),[...motives,...minors,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0LND38')),`depth3 List iota mismatch: ${pretty(reduced)}`);
}

// Depth 4 admission demonstrates this is not a new fixed depth-3 special case.
const Tree4={kind:'inductive',name:'Tree4ND38',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'Tree4ND38.leaf',type:C('Tree4ND38')},
  {name:'Tree4ND38.node',type:Pi(App(C('BoxND38'),App(C('BoxND38'),App(C('BoxND38'),App(C('BoxND38'),C('Tree4ND38'))))),C('Tree4ND38'))}
]};
{
  const e=env38();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree4);assert.ok(checked.generated.includes('Tree4ND38.rec_4'));assert.equal(e.get('Tree4ND38.rec').declaration.metadata.mutual.motiveCount,5);assert.deepEqual(e.get('Tree4ND38.rec').declaration.metadata.mutual.indexCounts,[0,0,0,0,0]);
}

// Mixed indexed depth 3 preserves outer-to-inner helper index counts.
const Idx={kind:'axiom',name:'IdxND38',levelParams:[],type:S(L1)},z={kind:'axiom',name:'zND38',levelParams:[],type:C('IdxND38')},s={kind:'axiom',name:'sND38',levelParams:[],type:Pi(C('IdxND38'),C('IdxND38'))};
const Vec={kind:'inductive',name:'VecND38',levelParams:[],type:Pi(S(L1),Pi(C('IdxND38'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'VecND38.nil',type:Pi(S(L1),Apps(C('VecND38'),[B(0),C('zND38')]))},
  {name:'VecND38.cons',type:Pi(S(L1),Pi(C('IdxND38'),Pi(B(1),Pi(Apps(C('VecND38'),[B(2),B(1)]),Apps(C('VecND38'),[B(3),App(C('sND38'),B(2))])))))}
]};
const TreeMixed={kind:'inductive',name:'TreeMixND38',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeMixND38.leaf',type:C('TreeMixND38')},
  {name:'TreeMixND38.node',type:Pi(App(C('BoxND38'),Apps(C('VecND38'),[App(C('BoxND38'),C('TreeMixND38')),C('zND38')])),C('TreeMixND38'))}
]};
{
  const e=env38();for(const d of [Idx,z,s,Box,Vec])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TreeMixed);assert.deepEqual(e.get('TreeMixND38.rec').declaration.metadata.mutual.indexCounts,[0,0,1,0]);
}

// v38 remains a superset of the exact v37 two-layer slice.
const Tree2={kind:'inductive',name:'Tree2ND38',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'Tree2ND38.leaf',type:C('Tree2ND38')},{name:'Tree2ND38.node',type:Pi(App(C('BoxND38'),App(C('BoxND38'),C('Tree2ND38'))),C('Tree2ND38'))}]};
{const e=env38();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Tree2);assert.ok(e.has('Tree2ND38.rec_2'));}

// Historical v37 keeps the exact two-layer boundary and rejects depth 3.
{
  const e=env37();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree3),/two-layer|nested slice|positive occurrence|recursive occurrence/i);assert.equal(e.has('Tree3ND38'),false);
}

// Strict v38 serialization/replay and historical semantic smuggling rejection.
{
  const declarations=[Box,Tree3];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-generalization0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper0'),/two-layer|nested slice|positive occurrence|recursive occurrence/i);
  const artifact=makeKernelNestedDeeperGeneralizationArtifact(declarations);assert.equal(artifact.formatVersion,38);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-generalization0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:37}),/unsupported v37 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper0'}),/unsupported v38 implementation profile/);
  const historical=makeKernelNestedDeeperArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/two-layer|nested slice|positive occurrence|recursive occurrence/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-v38-')),file=path.join(dir,'v38.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-v38-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive L (α : Type) : Type where\n| nil : L α\n| cons : α → L α → L α\ninductive Vec (α : Type) : Nat → Type where\n| nil : Vec α 0\n| cons : α → Vec α n → Vec α (n+1)\ninductive Tree3 : Type where\n| leaf : Tree3\n| node : Box (Box (Box Tree3)) → Tree3\n#print Tree3.rec\n#check Tree3.rec_3\ninductive Tree4 : Type where\n| leaf : Tree4\n| node : L (L (L (L Tree4))) → Tree4\n#print Tree4.rec\n#check Tree4.rec_4\ninductive TreeMix : Type where\n| leaf : TreeMix\n| node : Box (Vec (Box TreeMix) 0) → TreeMix\n#print TreeMix.rec\n#check TreeMix.rec_3\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/number of motives: 5/);assert.match(gr.stdout,/Tree3\.rec_3/);assert.match(gr.stdout,/Tree4\.rec_4/);assert.match(gr.stdout,/motive_3 : \(a : Nat\) → Vec \(Box TreeMix\) a → Sort/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_GENERALIZATION_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-generalization0',coreFormat:38,status:'accepted',supportedSlice:'parameterless/indexless monomorphic Type outer families with exactly one closed linear nested field of arbitrary finite depth >= 2; monomorphic one-parameter containers may carry independent indices',observations:{depth3Box:'accepted',depth3ListRecursiveIota:'accepted',depth4List:'accepted',mixedIndexedDepth3:'accepted',dynamicHelperRecursors:'accepted',fieldsFirstRecursiveHelpers:'accepted',serializedReplay:'accepted'},historicalIsolation:{v37Depth3Nested:'rejected'},explicitGaps:{outerParametersOrIndices:'unsupported',polymorphicDeepLayers:'unsupported',multipleDeepFields:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v38 arbitrary closed linear-depth nested preprocessing, dynamic helper recursors, depth3/depth4 recursive and indexed chains, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
