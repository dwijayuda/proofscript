import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelParam,levelSucc,levelMax,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedPolymorphicArtifact,makeKernelNestedMultipleSpecializationsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const U=levelParam('u'),V=levelParam('v'),TU=S(levelSucc(U)),TUV=S(levelSucc(levelMax(U,V)));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true};
const env34=()=>new Environment({...base,allowNestedPolymorphic:true}),env33=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxNP34',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'BoxNP34.mk',type:Pi(TU,Pi(B(0),App(C('BoxNP34',[U]),B(1))))}]};
const Tree={kind:'inductive',name:'TreeNP34',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
  {name:'TreeNP34.leaf',type:Pi(TU,App(C('TreeNP34',[U]),B(0)))},
  {name:'TreeNP34.node',type:Pi(TU,Pi(App(C('BoxNP34',[U]),App(C('TreeNP34',[U]),B(0))),App(C('TreeNP34',[U]),B(1))))},
]};
{
  const e=env34(); checkAndAddDeclaration(e,Box); const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeNP34.leaf','TreeNP34.node','TreeNP34.rec','TreeNP34.rec_1']);
  const rec=e.get('TreeNP34.rec')?.declaration,helper=e.get('TreeNP34.rec_1')?.declaration;
  assert.equal(rec?.kind,'recursor'); assert.equal(helper?.kind,'recursor');
  assert.deepEqual(rec.levelParams.slice(1),['u']); assert.deepEqual(helper.levelParams.slice(1),['u']);
  assert.match(pretty(rec.type),/BoxNP34/); assert.match(pretty(helper.type),/TreeNP34/);
  // Force node -> helper -> leaf to a concrete result at universe zero.
  const R={kind:'axiom',name:'ResultNP34',levelParams:[],type:S(levelSucc(LevelZero))},r0={kind:'axiom',name:'result0NP34',levelParams:[],type:C('ResultNP34')};
  checkAndAddDeclaration(e,R);checkAndAddDeclaration(e,r0);
  const type0=S(levelSucc(LevelZero));
  const alpha=type0; // instantiate u := 0, so α : Type 0 can itself be Type 0? No: Type 0 : Type 1. use ResultNP34 instead.
  const A=C('ResultNP34');
  const treeA=App(C('TreeNP34',[LevelZero]),A),boxTreeA=App(C('BoxNP34',[LevelZero]),treeA);
  const motiveT=Lam(treeA,C('ResultNP34')),motiveB=Lam(boxTreeA,C('ResultNP34'));
  const leafMinor=C('result0NP34');
  const nodeMinor=Lam(boxTreeA,Lam(C('ResultNP34'),B(0)));
  const boxMinor=Lam(treeA,Lam(C('ResultNP34'),B(0)));
  const leaf=App(C('TreeNP34.leaf',[LevelZero]),A);
  const major=Apps(C('TreeNP34.node',[LevelZero]),[A,Apps(C('BoxNP34.mk',[LevelZero]),[treeA,leaf])]);
  const recLevels=[levelSucc(LevelZero),LevelZero];
  const term=Apps(C('TreeNP34.rec',recLevels),[A,motiveT,motiveB,leafMinor,nodeMinor,boxMinor,major]);
  const reduced=kernelWhnf(e,term); assert.ok(sameTerm(reduced,C('result0NP34')),`polymorphic nested iota mismatch: ${pretty(reduced)}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('ResultNP34')));
}

// Explicitly instantiated two-universe container whose input and output both normalize to the outer universe.
const LiftBox={kind:'inductive',name:'LiftBoxNP34',levelParams:['a','b'],type:Pi(S(levelSucc(levelParam('a'))),S(levelSucc(levelMax(levelParam('a'),levelParam('b'))))),numParams:1,numIndices:0,constructors:[{name:'LiftBoxNP34.mk',type:Pi(S(levelSucc(levelParam('a'))),Pi(B(0),App(C('LiftBoxNP34',[levelParam('a'),levelParam('b')]),B(1))))}]};
const TreeMax={kind:'inductive',name:'TreeMaxNP34',levelParams:['u','v'],type:TUV,numParams:0,numIndices:0,constructors:[
  {name:'TreeMaxNP34.leaf',type:C('TreeMaxNP34',[U,V])},
  {name:'TreeMaxNP34.node',type:Pi(App(C('LiftBoxNP34',[levelMax(U,V),LevelZero]),C('TreeMaxNP34',[U,V])),C('TreeMaxNP34',[U,V]))},
]};
{
  const e=env34();checkAndAddDeclaration(e,LiftBox);const checked=checkAndAddDeclaration(e,TreeMax);assert.ok(checked.generated.includes('TreeMaxNP34.rec_1'));
  const rec=e.get('TreeMaxNP34.rec')?.declaration;assert.equal(rec?.kind,'recursor');assert.deepEqual(rec.levelParams.slice(1),['u','v']);
}

// Universe output mismatch remains fail-closed.
const BadTree={kind:'inductive',name:'BadTreeNP34',levelParams:['u','v'],type:S(levelSucc(U)),numParams:0,numIndices:0,constructors:[
  {name:'BadTreeNP34.leaf',type:C('BadTreeNP34',[U,V])},
  {name:'BadTreeNP34.node',type:Pi(App(C('LiftBoxNP34',[U,V]),C('BadTreeNP34',[U,V])),C('BadTreeNP34',[U,V]))},
]};
{
  const e=env34();checkAndAddDeclaration(e,LiftBox);assert.throws(()=>checkAndAddDeclaration(e,BadTree),/result universe must match|universe/i);assert.equal(e.has('BadTreeNP34'),false);
}

// Historical v33 preserves monomorphic-only semantics.
{
  const e=env33();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/monomorphic outer inductive|non-valid positive occurrence|nested/i);
}

// Strict v34 serialization/replay and historical semantic-smuggling rejection.
{
  const declarations=[Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-polymorphic0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-multiple-specializations0'),/monomorphic outer inductive|non-valid positive occurrence|nested/i);
  const artifact=makeKernelNestedPolymorphicArtifact(declarations);assert.equal(artifact.formatVersion,34);assert.equal(artifact.implementationProfile,'KERNEL-nested-polymorphic0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:33}),/unsupported v33 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-multiple-specializations0'}),/unsupported v34 implementation profile/);
  const historical=makeKernelNestedMultipleSpecializationsArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/monomorphic outer inductive|non-valid positive occurrence|nested/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-poly-v34-')),file=path.join(dir,'v34.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-poly-v34-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box.{u} (α : Type u) : Type u where\n| mk : α → Box α\n\ninductive Tree.{u} (α : Type u) : Type u where\n| leaf : Tree α\n| node : Box.{u} (Tree α) → Tree α\n#print Tree.rec\n#print Tree.rec_1\n\ninductive LiftBox.{u, v} (α : Type u) : Type (max u v) where\n| mk : α → LiftBox α\ninductive TreeMax.{u, v} : Type (max u v) where\n| leaf : TreeMax\n| node : LiftBox.{max u v, 0} TreeMax → TreeMax\n#print TreeMax.rec\n#print TreeMax.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/Tree\.rec\.\{u_1, u\}/);assert.match(gr.stdout,/Tree\.rec_1\.\{u_1, u\}/);assert.match(gr.stdout,/TreeMax\.rec\.\{u_1, u, v\}/);assert.match(gr.stdout,/number of motives: 2/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive LiftBox.{u, v} (α : Type u) : Type (max u v) where\n| mk : α → LiftBox α\ninductive BadTree.{u, v} : Type u where\n| leaf : BadTree\n| node : LiftBox.{u, v} BadTree → BadTree\n`);const br=spawnSync(lean,[bad],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Invalid universe level|universe/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_POLYMORPHIC_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-polymorphic0',coreFormat:34,status:'accepted',supportedSlice:'v33-compatible one-level nested preprocessing with explicit universe instantiation whose container input/output universe matches the outer family universe',observations:{sameUniversePolymorphicBox:'accepted',parameterizedOuter:'accepted',explicitMultiUniverseContainer:'accepted',linkedHelperIota:'accepted',universeMismatch:'rejected',serializedReplay:'accepted'},historicalIsolation:{v33PolymorphicNested:'rejected'},explicitGaps:{universeMetavariableInference:'unsupported',indexedContainer:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v34 bounded polymorphic nested preprocessing, explicit universe instantiation, linked helper iota, mismatch rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
