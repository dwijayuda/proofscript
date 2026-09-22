import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedParametersArtifact,makeKernelNestedInductivesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1); const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true};
const env30=()=>new Environment({...base,allowNestedParameters:true}),env29=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxNP30',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNP30.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNP30'),B(1))))}]};
const Tree={kind:'inductive',name:'TreeNP30',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'TreeNP30.leaf',type:Pi(S(L1),Pi(B(0),App(C('TreeNP30'),B(1))))},
  {name:'TreeNP30.node',type:Pi(S(L1),Pi(App(C('BoxNP30'),App(C('TreeNP30'),B(0))),App(C('TreeNP30'),B(1))))},
]};

// Historical v29 keeps parameterized nesting rejected.
{
  const e=env29();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/recursive occurrence|positive|nested|direct/i);assert.equal(e.has('TreeNP30'),false);
}

// v30 threads the shared parameter through both motives/helper recursors and computes linked iota.
{
  const e=env30();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeNP30.leaf','TreeNP30.node','TreeNP30.rec','TreeNP30.rec_1']);
  const rec=e.get('TreeNP30.rec')?.declaration,helper=e.get('TreeNP30.rec_1')?.declaration;
  assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');
  assert.equal(rec.metadata.numParams,1);assert.equal(helper.metadata.numParams,1);
  assert.match(pretty(rec.type),/Sort u_motive/);assert.match(pretty(rec.type),/BoxNP30\(TreeNP30\(/);
  const A={kind:'axiom',name:'ANP30',levelParams:[],type:S(L1)},a0={kind:'axiom',name:'a0NP30',levelParams:[],type:C('ANP30')},N={kind:'axiom',name:'NNP30',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0NP30',levelParams:[],type:C('NNP30')};
  for(const d of [A,a0,N,n0])checkAndAddDeclaration(e,d);
  const Aterm=C('ANP30'),treeA=App(C('TreeNP30'),Aterm),boxTree=App(C('BoxNP30'),treeA),mT=Lam(treeA,C('NNP30')),mB=Lam(boxTree,C('NNP30'));
  const leaf=Lam(Aterm,C('n0NP30')),node=Lam(boxTree,Lam(C('NNP30'),B(0))),boxMinor=Lam(treeA,Lam(C('NNP30'),B(0)));
  const leafMajor=Apps(C('TreeNP30.leaf'),[Aterm,C('a0NP30')]);
  const major=Apps(C('TreeNP30.node'),[Aterm,Apps(C('BoxNP30.mk'),[treeA,leafMajor])]);
  const term=Apps(C('TreeNP30.rec',[L1]),[Aterm,mT,mB,leaf,node,boxMinor,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n0NP30')),`parameterized nested iota mismatch: ${pretty(kernelWhnf(e,term))}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('NNP30')));
}

// Dependent outer parameters (α : Type) (x : α) are threaded unchanged.
const DTree={kind:'inductive',name:'DTreeNP30',levelParams:[],type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
  {name:'DTreeNP30.leaf',type:Pi(S(L1),Pi(B(0),Apps(C('DTreeNP30'),[B(1),B(0)])))},
  {name:'DTreeNP30.node',type:Pi(S(L1),Pi(B(0),Pi(App(C('BoxNP30'),Apps(C('DTreeNP30'),[B(1),B(0)])),Apps(C('DTreeNP30'),[B(2),B(1)]))))},
]};
{
  const e=env30();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,DTree);
  const rec=e.get('DTreeNP30.rec')?.declaration,helper=e.get('DTreeNP30.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');assert.equal(rec.metadata.numParams,2);assert.equal(helper.metadata.numParams,2);
  assert.match(pretty(rec.type),/DTreeNP30/);assert.match(pretty(rec.type),/BoxNP30/);
}

// The nested recursive target must preserve the fixed outer parameter.
const Nat={kind:'axiom',name:'NatNP30',levelParams:[],type:S(L1)};
const Bad={kind:'inductive',name:'BadNP30',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'BadNP30.mk',type:Pi(S(L1),Pi(App(C('BoxNP30'),App(C('BadNP30'),C('NatNP30'))),App(C('BadNP30'),B(1))))},
]};
{
  const e=env30();for(const d of [Box,Nat])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/parameter|uniform|corresponding|fixed/i);assert.equal(e.has('BadNP30'),false);assert.equal(e.has('BadNP30.rec'),false);assert.equal(e.has('BadNP30.rec_1'),false);
}

// Strict v30 serialization/replay and historical v29 semantic isolation.
{
  const declarations=[Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-inductives0'),/recursive occurrence|positive|nested|direct/i);
  const artifact=makeKernelNestedParametersArtifact(declarations);assert.equal(artifact.formatVersion,30);assert.equal(artifact.implementationProfile,'KERNEL-nested-parameters0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:29}),/unsupported v29 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-inductives0'}),/unsupported v30 implementation profile/);
  const historical=makeKernelNestedInductivesArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/recursive occurrence|positive|nested|direct/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-param-v30-')),file=path.join(dir,'v30.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 parameter threading, dependent parameters, and fixed-parameter rejection.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-param-v30-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Tree (α : Type) : Type where\n| leaf : α → Tree α\n| node : Box (Tree α) → Tree α\n#print Tree.rec\n#print Tree.rec_1\n\ninductive DTree (α : Type) (x : α) : Type where\n| leaf : DTree α x\n| node : Box (DTree α x) → DTree α x\n#print DTree.rec\n#print DTree.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/\{α : Type\}/);assert.match(gr.stdout,/motive_2 : Box \(Tree α\) → Sort/);assert.match(gr.stdout,/\{x : α\}/);assert.match(gr.stdout,/Box \(DTree α x\)/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Bad (α : Type) : Type where\n| mk : Box (Bad Nat) → Bad α\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Mismatched inductive type parameter|fixed throughout|parameter/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-parameters0',coreFormat:30,status:'accepted',supportedSlice:'v29 bounded one-container nested Type preprocessing extended through shared/dependent outer parameters',observations:{sharedOuterParameter:'accepted',dependentOuterParameters:'accepted',parameterAwareLinkedRecursors:'accepted',parameterizedNestedIota:'accepted',recursiveParameterVariation:'rejected',serializedReplay:'accepted'},historicalIsolation:{v29ParameterizedNestedSemantics:'rejected'},explicitGaps:{outerIndices:'unsupported',polymorphicOuterOrContainer:'unsupported',multipleNestedContainers:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v30 parameterized/dependent nested preprocessing, linked recursors/iota, fixed-parameter rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
