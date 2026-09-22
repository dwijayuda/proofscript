import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperArtifact,makeKernelRecursorMinorOrderArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true};
const env37=()=>new Environment({...base,allowNestedDeeper:true}),env36=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxND37',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BoxND37.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxND37'),B(1))))}
]};
const Tree={kind:'inductive',name:'TreeND37',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeND37.leaf',type:C('TreeND37')},
  {name:'TreeND37.node',type:Pi(App(C('BoxND37'),App(C('BoxND37'),C('TreeND37'))),C('TreeND37'))}
]};

// Box(Box Tree): exact three-family helper chain + end-to-end linked iota.
{
  const e=env37();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeND37.leaf','TreeND37.node','TreeND37.rec','TreeND37.rec_1','TreeND37.rec_2']);
  const r=e.get('TreeND37.rec')?.declaration,h1=e.get('TreeND37.rec_1')?.declaration,h2=e.get('TreeND37.rec_2')?.declaration;
  assert.equal(r?.kind,'recursor');assert.equal(h1?.kind,'recursor');assert.equal(h2?.kind,'recursor');
  assert.equal(r.metadata.mutual.motiveCount,3);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);
  assert.deepEqual(h1.metadata.rules[0].recursiveRecursors,['TreeND37.rec_2']);
  assert.deepEqual(h2.metadata.rules[0].recursiveRecursors,['TreeND37.rec']);
  const Out={kind:'axiom',name:'OutND37',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0ND37',levelParams:[],type:C('OutND37')};for(const d of [Out,out0])checkAndAddDeclaration(e,d);
  const tree=C('TreeND37'),boxTree=App(C('BoxND37'),tree),boxBoxTree=App(C('BoxND37'),boxTree),out=C('OutND37');
  const motiveT=Lam(tree,out),motiveBB=Lam(boxBoxTree,out),motiveB=Lam(boxTree,out);
  const leafMinor=C('out0ND37');
  const nodeMinor=Lam(boxBoxTree,Lam(out,B(0)));
  const outerMkMinor=Lam(boxTree,Lam(out,B(0)));
  const innerMkMinor=Lam(tree,Lam(out,B(0)));
  const inner=Apps(C('BoxND37.mk'),[tree,C('TreeND37.leaf')]);
  const outer=Apps(C('BoxND37.mk'),[boxTree,inner]);
  const major=App(C('TreeND37.node'),outer);
  const term=Apps(C('TreeND37.rec',[L1]),[motiveT,motiveBB,motiveB,leafMinor,nodeMinor,outerMkMinor,innerMkMinor,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0ND37')),`Box(Box Tree) linked iota mismatch: ${pretty(reduced)}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('OutND37')));
}

const List={kind:'inductive',name:'ListND37',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ListND37.nil',type:Pi(S(L1),App(C('ListND37'),B(0)))},
  {name:'ListND37.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListND37'),B(1)),App(C('ListND37'),B(2)))))}
]};
const TreeL={kind:'inductive',name:'TreeLND37',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeLND37.leaf',type:C('TreeLND37')},
  {name:'TreeLND37.node',type:Pi(App(C('ListND37'),App(C('ListND37'),C('TreeLND37'))),C('TreeLND37'))}
]};

// List(List Tree): fields-first recursive helper minors and three-way recursive iota.
{
  const e=env37();checkAndAddDeclaration(e,List);checkAndAddDeclaration(e,TreeL);
  const h1=e.get('TreeLND37.rec_1').declaration,h2=e.get('TreeLND37.rec_2').declaration;
  assert.deepEqual(h1.metadata.rules[1].recursiveRecursors,['TreeLND37.rec_2','TreeLND37.rec_1']);
  assert.deepEqual(h2.metadata.rules[1].recursiveRecursors,['TreeLND37.rec','TreeLND37.rec_2']);
  const Out={kind:'axiom',name:'OutLND37',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0LND37',levelParams:[],type:C('OutLND37')};for(const d of [Out,out0])checkAndAddDeclaration(e,d);
  const tree=C('TreeLND37'),lt=App(C('ListND37'),tree),llt=App(C('ListND37'),lt),out=C('OutLND37');
  const mT=Lam(tree,out),mLL=Lam(llt,out),mL=Lam(lt,out);
  const leaf=C('out0LND37'),node=Lam(llt,Lam(out,B(0)));
  const nilLL=C('out0LND37');
  // fields first: a : List Tree, tail : List (List Tree), then ihA, ihTail. Return ihA.
  const consLL=Lam(lt,Lam(llt,Lam(out,Lam(out,B(1)))));
  const nilL=C('out0LND37');
  // fields first: a : Tree, tail : List Tree, then ihA, ihTail. Return ihA.
  const consL=Lam(tree,Lam(lt,Lam(out,Lam(out,B(1)))));
  const nilInner=App(C('ListND37.nil'),tree);
  const inner=Apps(C('ListND37.cons'),[tree,C('TreeLND37.leaf'),nilInner]);
  const nilOuter=App(C('ListND37.nil'),lt);
  const outer=Apps(C('ListND37.cons'),[lt,inner,nilOuter]);
  const major=App(C('TreeLND37.node'),outer);
  const term=Apps(C('TreeLND37.rec',[L1]),[mT,mLL,mL,leaf,node,nilLL,consLL,nilL,consL,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0LND37')),`List(List Tree) linked iota mismatch: ${pretty(reduced)}`);
}

// Mixed indexed containers: helper index counts/telescopes follow the exact layer order.
const Idx={kind:'axiom',name:'IdxND37',levelParams:[],type:S(L1)},z={kind:'axiom',name:'zND37',levelParams:[],type:C('IdxND37')},s={kind:'axiom',name:'sND37',levelParams:[],type:Pi(C('IdxND37'),C('IdxND37'))};
const Vec={kind:'inductive',name:'VecND37',levelParams:[],type:Pi(S(L1),Pi(C('IdxND37'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'VecND37.nil',type:Pi(S(L1),Apps(C('VecND37'),[B(0),C('zND37')]))},
  {name:'VecND37.cons',type:Pi(S(L1),Pi(C('IdxND37'),Pi(B(1),Pi(Apps(C('VecND37'),[B(2),B(1)]),Apps(C('VecND37'),[B(3),App(C('sND37'),B(2))])))))}
]};
const TreeBV={kind:'inductive',name:'TreeBVND37',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeBVND37.leaf',type:C('TreeBVND37')},
  {name:'TreeBVND37.node',type:Pi(App(C('BoxND37'),Apps(C('VecND37'),[C('TreeBVND37'),C('zND37')])),C('TreeBVND37'))}
]};
const TreeVB={kind:'inductive',name:'TreeVBND37',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeVBND37.leaf',type:C('TreeVBND37')},
  {name:'TreeVBND37.node',type:Pi(Apps(C('VecND37'),[App(C('BoxND37'),C('TreeVBND37')),C('zND37')]),C('TreeVBND37'))}
]};
{
  const e=env37();for(const d of [Idx,z,s,Box,Vec])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TreeBV);assert.deepEqual(e.get('TreeBVND37.rec').declaration.metadata.mutual.indexCounts,[0,0,1]);
  checkAndAddDeclaration(e,TreeVB);assert.deepEqual(e.get('TreeVBND37.rec').declaration.metadata.mutual.indexCounts,[0,1,0]);
}

// Historical v36 keeps deeper nesting unavailable.
{
  const e=env36();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/one-level|nested slice|positive occurrence|recursive occurrence/i);assert.equal(e.has('TreeND37'),false);
}

// Strict v37 codec/replay plus historical semantic-smuggling rejection.
{
  const declarations=[Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-recursor-minor-order0'),/one-level|nested slice|positive occurrence|recursive occurrence/i);
  const artifact=makeKernelNestedDeeperArtifact(declarations);assert.equal(artifact.formatVersion,37);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:36}),/unsupported v36 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-recursor-minor-order0'}),/unsupported v37 implementation profile/);
  const historical=makeKernelRecursorMinorOrderArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/one-level|nested slice|positive occurrence|recursive occurrence/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-v37-')),file=path.join(dir,'v37.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-v37-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive MyList (α : Type) : Type where\n| nil : MyList α\n| cons : α → MyList α → MyList α\ninductive Vec (α : Type) : Nat → Type where\n| nil : Vec α 0\n| cons : α → Vec α n → Vec α (n+1)\ninductive TreeBB : Type where\n| leaf : TreeBB\n| node : Box (Box TreeBB) → TreeBB\n#print TreeBB.rec\n#check TreeBB.rec_1\n#check TreeBB.rec_2\ninductive TreeLL : Type where\n| leaf : TreeLL\n| node : MyList (MyList TreeLL) → TreeLL\n#print TreeLL.rec\n#check TreeLL.rec_1\n#check TreeLL.rec_2\ninductive TreeBV : Type where\n| leaf : TreeBV\n| node : Box (Vec TreeBV 0) → TreeBV\n#print TreeBV.rec\n#check TreeBV.rec_2\ninductive TreeVB : Type where\n| leaf : TreeVB\n| node : Vec (Box TreeVB) 0 → TreeVB\n#print TreeVB.rec\n#check TreeVB.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/TreeBB\.rec_1/);assert.match(gr.stdout,/TreeBB\.rec_2/);assert.match(gr.stdout,/MyList \(MyList TreeLL\)/);assert.match(gr.stdout,/motive_3 : \(a : Nat\) → Vec TreeBV a → Sort/);assert.match(gr.stdout,/motive_2 : \(a : Nat\) → Vec \(Box TreeVB\) a → Sort/);
  const bad=path.join(dir,'DependentIndex.lean');fs.writeFileSync(bad,`inductive Opt (α : Type) : Type where\n| none : Opt α\n| some : α → Opt α\ninductive DepOpt (α : Type) : Opt α → Type where\n| none : DepOpt α (Opt.none)\n| some : (x : α) → DepOpt α (Opt.some x)\ninductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Bad : Type where\n| node : Box (DepOpt Bad (Opt.none)) → Bad\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/unknown constant|nested inductive|parameters cannot contain local variables/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper0',coreFormat:37,status:'accepted',supportedSlice:'parameterless/indexless monomorphic Type outer families with exactly one closed two-container linear nested field; monomorphic one-parameter containers may carry independent indices',observations:{boxBox:'accepted',listList:'accepted',boxVec:'accepted',vecBox:'accepted',threeMotiveLinkedIota:'accepted',fieldsFirstRecursiveHelpers:'accepted',dependentContainerIndexDomain:'rejected',serializedReplay:'accepted'},historicalIsolation:{v36DeeperNested:'rejected'},explicitGaps:{outerParametersOrIndices:'unsupported',polymorphicDeepLayers:'unsupported',moreThanTwoLayers:'unsupported',multipleDeepFields:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v37 two-layer deeper nested preprocessing, three-way fields-first linked recursors/iota, recursive and indexed containers, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
