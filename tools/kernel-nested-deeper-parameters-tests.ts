import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperParametersArtifact,makeKernelNestedDeeperGeneralizationArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true};
const env39=()=>new Environment({...base,allowNestedDeeperParameters:true}),env38=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxNDP39',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNDP39.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNDP39'),B(1))))}]};
const Tree={kind:'inductive',name:'TreeNDP39',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'TreeNDP39.leaf',type:Pi(S(L1),Pi(B(0),App(C('TreeNDP39'),B(1))))},
  {name:'TreeNDP39.node',type:Pi(S(L1),Pi(App(C('BoxNDP39'),App(C('BoxNDP39'),App(C('TreeNDP39'),B(0)))),App(C('TreeNDP39'),B(1))))},
]};

// Shared parameter, exact helper metadata, and actual rec -> rec_1 -> rec_2 -> rec iota.
{
  const e=env39();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeNDP39.leaf','TreeNDP39.node','TreeNDP39.rec','TreeNDP39.rec_1','TreeNDP39.rec_2']);
  const r=e.get('TreeNDP39.rec').declaration,h1=e.get('TreeNDP39.rec_1').declaration,h2=e.get('TreeNDP39.rec_2').declaration;
  assert.equal(r.metadata.numParams,1);assert.equal(h1.metadata.numParams,1);assert.equal(h2.metadata.numParams,1);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);
  assert.deepEqual(h1.metadata.rules[0].recursiveRecursors,['TreeNDP39.rec_2']);assert.deepEqual(h2.metadata.rules[0].recursiveRecursors,['TreeNDP39.rec']);
  const A={kind:'axiom',name:'ANP39',levelParams:[],type:S(L1)},a0={kind:'axiom',name:'a0NP39',levelParams:[],type:C('ANP39')},N={kind:'axiom',name:'NNP39',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0NP39',levelParams:[],type:C('NNP39')};for(const d of [A,a0,N,n0])checkAndAddDeclaration(e,d);
  const a=C('ANP39'),t=App(C('TreeNDP39'),a),b1=App(C('BoxNDP39'),t),b2=App(C('BoxNDP39'),b1),Nty=C('NNP39');
  const motives=[Lam(t,Nty),Lam(b2,Nty),Lam(b1,Nty)];
  const leaf=Lam(a,C('n0NP39')),node=Lam(b2,Lam(Nty,B(0))),outerMk=Lam(b1,Lam(Nty,B(0))),innerMk=Lam(t,Lam(Nty,B(0)));
  const leafMajor=Apps(C('TreeNDP39.leaf'),[a,C('a0NP39')]),inner=Apps(C('BoxNDP39.mk'),[t,leafMajor]),outer=Apps(C('BoxNDP39.mk'),[b1,inner]),major=Apps(C('TreeNDP39.node'),[a,outer]);
  const term=Apps(C('TreeNDP39.rec',[L1]),[a,...motives,leaf,node,outerMk,innerMk,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('n0NP39')),`parameterized deep iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),Nty));
}

// Dependent outer parameters are copied unchanged to every helper family.
const List={kind:'inductive',name:'ListNDP39',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ListNDP39.nil',type:Pi(S(L1),App(C('ListNDP39'),B(0)))},
  {name:'ListNDP39.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListNDP39'),B(1)),App(C('ListNDP39'),B(2)))))}
]};
const DTree={kind:'inductive',name:'DTreeNDP39',levelParams:[],type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
  {name:'DTreeNDP39.leaf',type:Pi(S(L1),Pi(B(0),Apps(C('DTreeNDP39'),[B(1),B(0)])))},
  {name:'DTreeNDP39.node',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListNDP39'),App(C('ListNDP39'),Apps(C('DTreeNDP39'),[B(1),B(0)]))),Apps(C('DTreeNDP39'),[B(2),B(1)]))))},
]};
{
  const e=env39();checkAndAddDeclaration(e,List);checkAndAddDeclaration(e,DTree);for(const n of ['DTreeNDP39.rec','DTreeNDP39.rec_1','DTreeNDP39.rec_2'])assert.equal(e.get(n).declaration.metadata.numParams,2);const pt=pretty(e.get('DTreeNDP39.rec').declaration.type);assert.match(pt,/ListNDP39\(ListNDP39\(DTreeNDP39/);
}

// Parameter-derived container index survives projection into the parameter context.
const Nat={kind:'axiom',name:'NatNDP39',levelParams:[],type:S(L1)};
const Vec={kind:'inductive',name:'VecNDP39',levelParams:[],type:Pi(S(L1),Pi(C('NatNDP39'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'VecNDP39.nil',type:Pi(S(L1),Apps(C('VecNDP39'),[B(0),C('zeroNDP39')]))},
  {name:'VecNDP39.cons',type:Pi(S(L1),Pi(C('NatNDP39'),Pi(B(1),Pi(Apps(C('VecNDP39'),[B(2),B(1)]),Apps(C('VecNDP39'),[B(3),App(C('succNDP39'),B(2))])))))}
]};
const zero={kind:'axiom',name:'zeroNDP39',levelParams:[],type:C('NatNDP39')},succ={kind:'axiom',name:'succNDP39',levelParams:[],type:Pi(C('NatNDP39'),C('NatNDP39'))};
const TreeIdx={kind:'inductive',name:'TreeIdxNDP39',levelParams:[],type:Pi(C('NatNDP39'),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'TreeIdxNDP39.leaf',type:Pi(C('NatNDP39'),App(C('TreeIdxNDP39'),B(0)))},
  {name:'TreeIdxNDP39.node',type:Pi(C('NatNDP39'),Pi(App(C('BoxNDP39'),Apps(C('VecNDP39'),[App(C('BoxNDP39'),App(C('TreeIdxNDP39'),B(0))),B(0)])),App(C('TreeIdxNDP39'),B(1))))},
]};
{
  const e=env39();for(const d of [Nat,zero,succ,Box,Vec])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TreeIdx);const r=e.get('TreeIdxNDP39.rec').declaration;assert.equal(r.metadata.numParams,1);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,1,0]);assert.match(pretty(r.type),/VecNDP39\(BoxNDP39\(TreeIdxNDP39/);
}

// Lean's fixed-parameter rule remains enforced even inside a deep chain.
const BadFixed={kind:'inductive',name:'BadFixedNDP39',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BadFixedNDP39.mk',type:Pi(S(L1),Pi(App(C('BoxNDP39'),App(C('BoxNDP39'),App(C('BadFixedNDP39'),C('NatNDP39')))),App(C('BadFixedNDP39'),B(1))))}
]};
{
  const e=env39();for(const d of [Box,Nat])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,BadFixed),/parameter|uniform|fixed|recursive occurrence|positive/i);assert.equal(e.has('BadFixedNDP39'),false);
}
const BadChanged={kind:'inductive',name:'BadChangedNDP39',levelParams:[],type:Pi(C('NatNDP39'),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BadChangedNDP39.mk',type:Pi(C('NatNDP39'),Pi(App(C('BoxNDP39'),App(C('BoxNDP39'),App(C('BadChangedNDP39'),App(C('succNDP39'),B(0))))),App(C('BadChangedNDP39'),B(1))))}
]};
{
  const e=env39();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,BadChanged),/parameter|uniform|fixed|recursive occurrence|positive/i);assert.equal(e.has('BadChangedNDP39'),false);
}

// Historical v38 remains parameterless for the arbitrary-depth deep checker.
{
  const e=env38();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/recursive occurrence|positive|nested|direct|parameter/i);assert.equal(e.has('TreeNDP39'),false);
}

// Strict Core39 serialization/replay and historical semantic-smuggling rejection.
{
  const declarations=[Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-generalization0'),/recursive occurrence|positive|nested|direct|parameter/i);
  const artifact=makeKernelNestedDeeperParametersArtifact(declarations);assert.equal(artifact.formatVersion,39);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-parameters0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:38}),/unsupported v38 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-generalization0'}),/unsupported v39 implementation profile/);
  const historical=makeKernelNestedDeeperGeneralizationArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/recursive occurrence|positive|nested|direct|parameter/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-param-v39-')),file=path.join(dir,'v39.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-deeper-param-v39-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive L (α : Type) : Type where\n| nil : L α\n| cons : α → L α → L α\ninductive Vec (α : Type) : Nat → Type where\n| nil : Vec α 0\n| cons : α → Vec α n → Vec α (n+1)\ninductive Tree (α : Type) : Type where\n| leaf : α → Tree α\n| node : Box (Box (Tree α)) → Tree α\n#print Tree.rec\n#check Tree.rec_2\ninductive DTree (α : Type) (x : α) : Type where\n| leaf : DTree α x\n| node : L (L (DTree α x)) → DTree α x\n#print DTree.rec\n#check DTree.rec_2\ninductive TreeIdx (n : Nat) : Type where\n| leaf : TreeIdx n\n| node : Box (Vec (Box (TreeIdx n)) n) → TreeIdx n\n#print TreeIdx.rec\n#check TreeIdx.rec_3\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of parameters: 1/);assert.match(gr.stdout,/number of parameters: 2/);assert.match(gr.stdout,/motive_3 : Box \(Tree α\) → Sort/);assert.match(gr.stdout,/L \(DTree α x\)/);assert.match(gr.stdout,/motive_3 : \(a : Nat\) → Vec \(Box \(TreeIdx n\)\) a → Sort/);
  const bad1=path.join(dir,'BadFixed.lean');fs.writeFileSync(bad1,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Bad (α : Type) : Type where\n| mk : Box (Box (Bad Nat)) → Bad α\n`);const br1=spawnSync(lean,[bad1],{encoding:'utf8'});assert.notEqual(br1.status,0);assert.match(br1.stderr+br1.stdout,/Mismatched inductive type parameter|fixed throughout|parameter/i);
  const bad2=path.join(dir,'BadChanged.lean');fs.writeFileSync(bad2,`inductive Box (α : Type) : Type where\n| mk : α → Box α\ninductive Bad (n : Nat) : Type where\n| mk : Box (Box (Bad (n+1))) → Bad n\n`);const br2=spawnSync(lean,[bad2],{encoding:'utf8'});assert.notEqual(br2.status,0);assert.match(br2.stderr+br2.stdout,/Mismatched inductive type parameter|fixed throughout|parameter/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-parameters0',coreFormat:39,status:'accepted',supportedSlice:'monomorphic indexless outer Type families with uniform/dependent parameters and exactly one arbitrary-depth linear nested field; one-parameter containers may carry indices whose expressions depend only on outer parameters',observations:{sharedOuterParameter:'accepted',dependentOuterParameters:'accepted',parameterAwareDeepIota:'accepted',parameterDerivedContainerIndex:'accepted',fixedParameterVariation:'rejected',serializedReplay:'accepted'},historicalIsolation:{v38ParameterizedDeepSemantics:'rejected'},explicitGaps:{outerIndices:'unsupported',polymorphicDeepLayers:'unsupported',multipleDeepFields:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v39 arbitrary-depth parameterized/dependent nested preprocessing, parameter-derived container indices, linked iota, fixed-parameter rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
