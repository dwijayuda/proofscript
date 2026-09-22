import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelParam,levelOfNat,levelSucc,levelMax,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperPolymorphicArtifact,makeKernelNestedDeeperIndicesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const U=levelParam('u'),V=levelParam('v'),L1=levelOfNat(1),TU={tag:'sort',level:levelSucc(U)},S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true};
const env41=()=>new Environment({...base,allowNestedDeeperPolymorphic:true}),env40=()=>new Environment(base);
const Box={kind:'inductive',name:'BoxNDP41',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'BoxNDP41.mk',type:Pi(TU,Pi(B(0),App(C('BoxNDP41',[U]),B(1))))}]};
const BX=t=>App(C('BoxNDP41',[U]),t),BB=t=>BX(BX(t)),BBB=t=>BX(BB(t));
const Tree={kind:'inductive',name:'TreeNDP41',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
 {name:'TreeNDP41.leaf',type:Pi(TU,Pi(B(0),App(C('TreeNDP41',[U]),B(1))))},
 {name:'TreeNDP41.node',type:Pi(TU,Pi(BB(App(C('TreeNDP41',[U]),B(0))),App(C('TreeNDP41',[U]),B(1))))},
]};
// Parameterized polymorphic depth-2 with actual three-way linked iota.
{
 const e=env41();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Tree);const r=e.get('TreeNDP41.rec').declaration;
 assert.deepEqual(r.levelParams.slice(1),['u']);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);assert.ok(e.has('TreeNDP41.rec_2'));
 const R={kind:'axiom',name:'ResultNDP41',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'result0NDP41',levelParams:[],type:C('ResultNDP41')};checkAndAddDeclaration(e,R);checkAndAddDeclaration(e,r0);
 const A=C('ResultNDP41'),tree=App(C('TreeNDP41',[LevelZero]),A),b=App(C('BoxNDP41',[LevelZero]),tree),bb=App(C('BoxNDP41',[LevelZero]),b),Rt=C('ResultNDP41');
 const mT=Lam(tree,Rt),mBB=Lam(bb,Rt),mB=Lam(b,Rt);const leaf=Lam(A,C('result0NDP41')),node=Lam(bb,Lam(Rt,B(0))),mk1=Lam(b,Lam(Rt,B(0))),mk2=Lam(tree,Lam(Rt,B(0)));
 const leafMajor=Apps(C('TreeNDP41.leaf',[LevelZero]),[A,C('result0NDP41')]);const inner=Apps(C('BoxNDP41.mk',[LevelZero]),[tree,leafMajor]);const outer=Apps(C('BoxNDP41.mk',[LevelZero]),[b,inner]);const major=Apps(C('TreeNDP41.node',[LevelZero]),[A,outer]);
 const term=Apps(C('TreeNDP41.rec',[L1,LevelZero]),[A,mT,mBB,mB,leaf,node,mk1,mk2,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0NDP41')),`v41 poly deep iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),Rt));
}
const Nat={kind:'axiom',name:'NatNDP41',levelParams:[],type:S(L1)},zero={kind:'axiom',name:'zeroNDP41',levelParams:[],type:C('NatNDP41')},one={kind:'axiom',name:'oneNDP41',levelParams:[],type:C('NatNDP41')};
const Fixed={kind:'inductive',name:'FixedNDP41',levelParams:['u'],type:Pi(TU,Pi(C('NatNDP41'),TU)),numParams:1,numIndices:1,constructors:[
 {name:'FixedNDP41.leaf',type:Pi(TU,Apps(C('FixedNDP41',[U]),[B(0),C('zeroNDP41')]))},
 {name:'FixedNDP41.node',type:Pi(TU,Pi(BB(Apps(C('FixedNDP41',[U]),[B(0),C('zeroNDP41')])),Apps(C('FixedNDP41',[U]),[B(1),C('oneNDP41')])))}
]};
{
 const e=env41();for(const d of [Nat,zero,one,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Fixed);const r=e.get('FixedNDP41.rec').declaration;assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,0,0]);assert.deepEqual(r.levelParams.slice(1),['u']);
}
const Capt={kind:'inductive',name:'CaptNDP41',levelParams:['u'],type:Pi(TU,Pi(C('NatNDP41'),TU)),numParams:1,numIndices:1,constructors:[
 {name:'CaptNDP41.node',type:Pi(TU,Pi(C('NatNDP41'),Pi(BB(Apps(C('CaptNDP41',[U]),[B(1),B(0)])),Apps(C('CaptNDP41',[U]),[B(2),B(1)]))))}
]};
{
 const e=env41();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Capt);const r=e.get('CaptNDP41.rec').declaration;assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.numIndices,0);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);assert.deepEqual(r.levelParams.slice(1),['u']);
}
// Depth-3 polymorphic chain.
const Deep3={kind:'inductive',name:'Deep3NDP41',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
 {name:'Deep3NDP41.node',type:Pi(TU,Pi(BBB(App(C('Deep3NDP41',[U]),B(0))),App(C('Deep3NDP41',[U]),B(1))))}
]};
{const e=env41();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Deep3);const r=e.get('Deep3NDP41.rec').declaration;assert.equal(r.metadata.mutual.motiveCount,4);assert.ok(e.has('Deep3NDP41.rec_3'));}
// Explicit multi-universe container instantiation that normalizes to outer u.
const LiftBox={kind:'inductive',name:'LiftBoxNDP41',levelParams:['a','b'],type:Pi(S(levelSucc(levelParam('a'))),S(levelSucc(levelMax(levelParam('a'),levelParam('b'))))),numParams:1,numIndices:0,constructors:[{name:'LiftBoxNDP41.mk',type:Pi(S(levelSucc(levelParam('a'))),Pi(B(0),App(C('LiftBoxNDP41',[levelParam('a'),levelParam('b')]),B(1))))}]};
const LB=t=>App(C('LiftBoxNDP41',[U,LevelZero]),t);
const Multi={kind:'inductive',name:'MultiNDP41',levelParams:['u'],type:S(levelSucc(U)),numParams:0,numIndices:0,constructors:[{name:'MultiNDP41.node',type:Pi(LB(LB(C('MultiNDP41',[U]))),C('MultiNDP41',[U]))}]};
{const e=env41();checkAndAddDeclaration(e,LiftBox);checkAndAddDeclaration(e,Multi);assert.ok(e.has('MultiNDP41.rec_2'));}
const Bad={kind:'inductive',name:'BadNDP41',levelParams:['u','v'],type:S(levelSucc(U)),numParams:0,numIndices:0,constructors:[{name:'BadNDP41.node',type:Pi(App(C('LiftBoxNDP41',[U,V]),App(C('LiftBoxNDP41',[U,V]),C('BadNDP41',[U,V]))),C('BadNDP41',[U,V]))}]};
{const e=env41();checkAndAddDeclaration(e,LiftBox);assert.throws(()=>checkAndAddDeclaration(e,Bad),/universe|result universe|parameter universe/i);assert.equal(e.has('BadNDP41'),false);}
// Historical v40 retains deep polymorphism as unavailable.
{const e=env40();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/monomorphic|nested|positive|recursive/i);}
// Strict Core41 replay/profile isolation.
{
 const declarations=[Box,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-polymorphic0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-indices0'),/monomorphic|nested|positive|recursive/i);
 const artifact=makeKernelNestedDeeperPolymorphicArtifact(declarations);assert.equal(artifact.formatVersion,41);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-polymorphic0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:40}),/unsupported v40 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-indices0'}),/unsupported v41 implementation profile/);
 const historical=makeKernelNestedDeeperIndicesArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/monomorphic|nested|positive|recursive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v41-')),file=path.join(dir,'v41.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v41-lean-'));const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`universe u\ninductive PBox (α : Type u) : Type u where | mk : α → PBox α\ninductive Tree (α : Type u) : Type u where | leaf : α → Tree α | node : PBox (PBox (PBox (Tree α))) → Tree α\n#print Tree.rec\n#check Tree.rec_3\ninductive Fixed (α : Type u) : Nat → Type u where | leaf : Fixed α 0 | node : PBox (PBox (Fixed α 0)) → Fixed α 1\n#print Fixed.rec\ninductive Capt (α : Type u) : Nat → Type u where | node (n : Nat) : PBox (PBox (Capt α n)) → Capt α n\n#print Capt.rec\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);const out=gr.stdout;assert.match(out,/Tree\.rec\.\{u_1, u\}/);assert.match(out,/Tree\.rec_3/);assert.match(out,/number of motives: 4/);assert.match(out,/number of indices: 1/);assert.match(out,/number of parameters: 2/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`universe u v\ninductive LiftBox (α : Type u) : Type (max u v) where | mk : α → LiftBox α\ninductive Bad : Type u where | node : LiftBox.{u,v} (LiftBox.{u,v} Bad) → Bad\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/universe|Invalid universe|Application type mismatch|Type \(max/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_POLYMORPHIC_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-polymorphic0',coreFormat:41,status:'accepted',supportedSlice:'arbitrary-depth explicitly universe-instantiated nested helper chains over parameterized/indexed Type families, including fixed and captured/promoted outer-index modes and indexed containers, with every container layer parameter/result universe definitionally equal to the outer family universe',observations:{parameterizedDepth3:'accepted',indexedFixed:'accepted',indexedCapturedPromoted:'accepted',explicitMultiUniverseContainer:'accepted',linkedIota:'accepted',universeMismatch:'rejected',serializedReplay:'accepted'},historicalIsolation:{v40DeepPolymorphic:'rejected'},explicitGaps:{universeMetavariableInference:'unsupported',multipleDeepFields:'unsupported',nestedProp:'unsupported',generalMixedSpecializations:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v41 arbitrary-depth explicit-universe polymorphic nested preprocessing, indexed fixed/captured modes, linked iota, mismatch rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean unavailable)'}`);
