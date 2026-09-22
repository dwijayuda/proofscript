import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperPropArtifact,makeKernelNestedDeeperMultipleFieldsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=LevelZero,L1=levelOfNat(1),S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true};
const env43=()=>new Environment({...base,allowNestedDeeperProp:true}),env42=()=>new Environment(base);

const PBox={kind:'inductive',name:'PBoxNDP43',levelParams:[],type:Pi(S(L0),S(L0)),numParams:1,numIndices:0,constructors:[{name:'PBoxNDP43.mk',type:Pi(S(L0),Pi(B(0),App(C('PBoxNDP43'),B(1))))}]};
const PB=t=>App(C('PBoxNDP43'),t),PBB=t=>PB(PB(t));
const R={kind:'axiom',name:'RNDP43',levelParams:[],type:S(L0)},r={kind:'axiom',name:'rNDP43',levelParams:[],type:C('RNDP43')};

// Single-field deep Prop: three Prop-only motives, no fresh recursor universe, actual linked iota.
const Tree={kind:'inductive',name:'TreeNDP43',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
 {name:'TreeNDP43.leaf',type:C('TreeNDP43')},
 {name:'TreeNDP43.node',type:Pi(PBB(C('TreeNDP43')),C('TreeNDP43'))},
]};
{
 const e=env43();for(const d of [PBox,R,r])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Tree);const rec=e.get('TreeNDP43.rec').declaration;
 assert.deepEqual(checked.generated,['TreeNDP43.leaf','TreeNDP43.node','TreeNDP43.rec','TreeNDP43.rec_1','TreeNDP43.rec_2']);
 assert.deepEqual(rec.levelParams,[]);assert.equal(rec.metadata.mutual.motiveCount,3);assert.deepEqual(rec.metadata.mutual.indexCounts,[0,0,0]);
 assert.deepEqual(rec.metadata.rules[1].recursiveRecursors,['TreeNDP43.rec_1']);
 assert.deepEqual(e.get('TreeNDP43.rec_1').declaration.metadata.rules[0].recursiveRecursors,['TreeNDP43.rec_2']);
 assert.deepEqual(e.get('TreeNDP43.rec_2').declaration.metadata.rules[0].recursiveRecursors,['TreeNDP43.rec']);
 const tree=C('TreeNDP43'),pb=PB(tree),pbb=PBB(tree),RT=C('RNDP43');
 const mT=Lam(tree,RT),mBB=Lam(pbb,RT),mB=Lam(pb,RT),leaf=C('rNDP43');
 const node=Lam(pbb,Lam(RT,B(0))),mkOuter=Lam(pb,Lam(RT,B(0))),mkInner=Lam(tree,Lam(RT,B(0)));
 const inner=Apps(C('PBoxNDP43.mk'),[tree,C('TreeNDP43.leaf')]);const outer=Apps(C('PBoxNDP43.mk'),[pb,inner]);const major=App(C('TreeNDP43.node'),outer);
 const term=Apps(C('TreeNDP43.rec'),[mT,mBB,mB,leaf,node,mkOuter,mkInner,major]);const reduced=kernelWhnf(e,term);
 assert.ok(sameTerm(reduced,C('rNDP43')),`nested Prop linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),RT));
}

// Parameterized outer Prop threads the shared Prop parameter through all helpers.
const PTree={kind:'inductive',name:'PTreeNDP43',levelParams:[],type:Pi(S(L0),S(L0)),numParams:1,numIndices:0,constructors:[
 {name:'PTreeNDP43.leaf',type:Pi(S(L0),Pi(B(0),App(C('PTreeNDP43'),B(1))))},
 {name:'PTreeNDP43.node',type:Pi(S(L0),Pi(PBB(App(C('PTreeNDP43'),B(0))),App(C('PTreeNDP43'),B(1))))},
]};
{
 const e=env43();checkAndAddDeclaration(e,PBox);checkAndAddDeclaration(e,PTree);const rec=e.get('PTreeNDP43.rec').declaration;
 assert.deepEqual(rec.levelParams,[]);assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.mutual.motiveCount,3);assert.match(pretty(rec.type),/PTreeNDP43/);
}

// Fixed indexed outer Prop retains its public index motive while helpers remain Prop.
const Nat={kind:'axiom',name:'NatNDP43',levelParams:[],type:S(L1)},z={kind:'axiom',name:'zNDP43',levelParams:[],type:C('NatNDP43')},o={kind:'axiom',name:'oNDP43',levelParams:[],type:C('NatNDP43')};
const ITree={kind:'inductive',name:'ITreeNDP43',levelParams:[],type:Pi(C('NatNDP43'),S(L0)),numParams:0,numIndices:1,constructors:[
 {name:'ITreeNDP43.leaf',type:App(C('ITreeNDP43'),C('zNDP43'))},
 {name:'ITreeNDP43.node',type:Pi(PBB(App(C('ITreeNDP43'),C('zNDP43'))),App(C('ITreeNDP43'),C('oNDP43')))},
]};
{
 const e=env43();for(const d of [Nat,z,o,PBox])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ITree);const rec=e.get('ITreeNDP43.rec').declaration;
 assert.deepEqual(rec.levelParams,[]);assert.equal(rec.metadata.numIndices,1);assert.deepEqual(rec.metadata.mutual.indexCounts,[1,0,0]);
}

// Multiple independent nested Prop fields share the v42 specialization graph in Prop mode.
const PList={kind:'inductive',name:'PListNDP43',levelParams:[],type:Pi(S(L0),S(L0)),numParams:1,numIndices:0,constructors:[
 {name:'PListNDP43.nil',type:Pi(S(L0),App(C('PListNDP43'),B(0)))},
 {name:'PListNDP43.cons',type:Pi(S(L0),Pi(B(0),Pi(App(C('PListNDP43'),B(1)),App(C('PListNDP43'),B(2)))))}]};
const PL=t=>App(C('PListNDP43'),t),PLL=t=>PL(PL(t));
const Multi={kind:'inductive',name:'MultiNDP43',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[
 {name:'MultiNDP43.leaf',type:C('MultiNDP43')},
 {name:'MultiNDP43.node',type:Pi(PBB(C('MultiNDP43')),Pi(PLL(C('MultiNDP43')),C('MultiNDP43')))},
]};
{
 const e=env43();for(const d of [PBox,PList])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Multi);const rec=e.get('MultiNDP43.rec').declaration;
 assert.deepEqual(rec.levelParams,[]);assert.equal(rec.metadata.mutual.motiveCount,5);assert.deepEqual(rec.metadata.rules[1].recursiveRecursors,['MultiNDP43.rec_1','MultiNDP43.rec_2']);assert.ok(e.has('MultiNDP43.rec_4'));
}

// Type-valued v42 semantics are inherited unchanged under the v43 profile.
const BoxT={kind:'inductive',name:'BoxTNDP43',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxTNDP43.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxTNDP43'),B(1))))}]};
const BT=t=>App(C('BoxTNDP43'),t),BBT=t=>BT(BT(t));
const TypeTree={kind:'inductive',name:'TypeTreeNDP43',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'TypeTreeNDP43.node',type:Pi(BBT(C('TypeTreeNDP43')),Pi(BBT(C('TypeTreeNDP43')),C('TypeTreeNDP43')))}]};
{
 const e=env43();checkAndAddDeclaration(e,BoxT);checkAndAddDeclaration(e,TypeTree);assert.equal(e.get('TypeTreeNDP43.rec').declaration.metadata.mutual.motiveCount,3);
}

// Historical v42 rejects nested Prop; strict v43 codec/replay and relabel isolation.
{
 const declarations=[PBox,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-prop0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multiple-fields0'),/Prop|positive|nested|outside|recursive/i);
 const artifact=makeKernelNestedDeeperPropArtifact(declarations);assert.equal(artifact.formatVersion,43);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-prop0');
 const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:42}),/unsupported v42 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-multiple-fields0'}),/unsupported v43 implementation profile/);
 const historical=makeKernelNestedDeeperMultipleFieldsArtifact([PBox]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/Prop|positive|nested|outside|recursive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-prop-v43-')),file=path.join(dir,'v43.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-prop-v43-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive PBox (P : Prop) : Prop where\n| mk : P → PBox P\ninductive Tree : Prop where\n| leaf : Tree\n| node : PBox (PBox Tree) → Tree\n#print Tree.rec\n#check Tree.rec_1\n#check Tree.rec_2\n\ninductive PTree (P : Prop) : Prop where\n| leaf : P → PTree P\n| node : PBox (PBox (PTree P)) → PTree P\n#print PTree.rec\n\ninductive ITree : Nat → Prop where\n| leaf : ITree 0\n| node : PBox (PBox (ITree 0)) → ITree 1\n#print ITree.rec\n`);
 const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/Tree → Prop/);assert.match(gr.stdout,/number of indices: 1/);assert.doesNotMatch(gr.stdout,/Tree\.rec\.\{u/);
 const badLarge=path.join(dir,'BadLarge.lean');fs.writeFileSync(badLarge,`inductive PBox (P : Prop) : Prop where | mk : P → PBox P\ninductive Tree : Prop where | leaf : Tree | node : PBox (PBox Tree) → Tree\nexample (t : Tree) : Nat := Tree.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) (motive_3 := fun _ => Nat) 0 (fun _ _ => 0) (fun _ _ => 0) (fun _ _ => 0) t\n`);const br=spawnSync(lean,[badLarge],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/expected to have type\s+Prop|type mismatch/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_PROP_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-prop0',coreFormat:43,status:'accepted',supportedSlice:'graph-based arbitrary-depth nested Prop preprocessing inheriting v42 parameters/indices/universe/multiple-field semantics with Prop-only mutual motives',observations:{singleField:'accepted',linkedPropIota:'accepted',parameterized:'accepted',indexedFixed:'accepted',multipleFields:'accepted',propOnlyMotiveUniverse:'accepted',largeElimination:'rejected',typeV42Inherited:'accepted',serializedReplay:'accepted'},historicalIsolation:{v42NestedProp:'rejected'},explicitGaps:{nonlinearMultiParameterNestedContainers:'unsupported',remainingGeneralRecursorEdges:'partial',resourceHardening:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v43 nested Prop graph, Prop-only recursors, linked proof iota, parameters/indices/multiple fields, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
