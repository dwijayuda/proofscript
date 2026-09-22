import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedIndexedContainersArtifact,makeKernelNestedPolymorphicArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=levelOfNat(0),L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true};
const env35=()=>new Environment({...base,allowNestedIndexedContainers:true}),env34=()=>new Environment(base);

const Idx={kind:'axiom',name:'IdxNIC35',levelParams:[],type:S(L1)};
const z={kind:'axiom',name:'zNIC35',levelParams:[],type:C('IdxNIC35')};
const s={kind:'axiom',name:'sNIC35',levelParams:[],type:Pi(C('IdxNIC35'),C('IdxNIC35'))};
const Out={kind:'axiom',name:'OutNIC35',levelParams:[],type:S(L1)};
const out0={kind:'axiom',name:'out0NIC35',levelParams:[],type:C('OutNIC35')};
const Vec={kind:'inductive',name:'VecNIC35',levelParams:[],type:Pi(S(L1),Pi(C('IdxNIC35'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'VecNIC35.nil',type:Pi(S(L1),Apps(C('VecNIC35'),[B(0),C('zNIC35')]))},
  {name:'VecNIC35.cons',type:Pi(S(L1),Pi(C('IdxNIC35'),Pi(B(1),Pi(Apps(C('VecNIC35'),[B(2),B(1)]),Apps(C('VecNIC35'),[B(3),App(C('sNIC35'),B(2))])))))},
]};
const Tree={kind:'inductive',name:'TreeNIC35',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TreeNIC35.leaf',type:C('TreeNIC35')},
  {name:'TreeNIC35.node',type:Pi(C('IdxNIC35'),Pi(Apps(C('VecNIC35'),[C('TreeNIC35'),B(0)]),C('TreeNIC35')))},
]};

// v35 preserves the indexed container telescope and computes through its recursive constructors.
{
  const e=env35();for(const d of [Idx,z,s,Out,out0,Vec])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeNIC35.leaf','TreeNIC35.node','TreeNIC35.rec','TreeNIC35.rec_1']);
  const r=e.get('TreeNIC35.rec')?.declaration,h=e.get('TreeNIC35.rec_1')?.declaration;assert.equal(r?.kind,'recursor');assert.equal(h?.kind,'recursor');
  assert.equal(h.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[0,1]);assert.deepEqual(h.metadata.mutual.indexCounts,[0,1]);
  assert.match(pretty(r.type),/VecNIC35/);assert.match(pretty(h.type),/IdxNIC35/);
  const idx=C('IdxNIC35'),tree=C('TreeNIC35'),out=C('OutNIC35');
  const vecAt=i=>Apps(C('VecNIC35'),[tree,i]);
  const motiveT=Lam(tree,out),motiveV=Lam(idx,Lam(vecAt(B(0)),out));
  const leafMinor=C('out0NIC35');
  const nodeMinor=Lam(idx,Lam(vecAt(B(0)),Lam(out,B(0))));
  const nilMinor=C('out0NIC35');
  const consMinor=Lam(idx,Lam(tree,Lam(out,Lam(vecAt(B(2)),Lam(out,B(2))))));
  const leaf=C('TreeNIC35.leaf'),nil=App(C('VecNIC35.nil'),tree);
  const one=App(C('sNIC35'),C('zNIC35'));
  const cons=Apps(C('VecNIC35.cons'),[tree,C('zNIC35'),leaf,nil]);
  const major=Apps(C('TreeNIC35.node'),[one,cons]);
  const term=Apps(C('TreeNIC35.rec',[L1]),[motiveT,motiveV,leafMinor,nodeMinor,nilMinor,consMinor,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0NIC35')),`indexed nested iota mismatch: ${pretty(reduced)}`);
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('OutNIC35')));
}

// A uniform outer parameter may be used as the indexed container's index.
const ParamTree={kind:'inductive',name:'ParamTreeNIC35',levelParams:[],type:Pi(C('IdxNIC35'),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ParamTreeNIC35.leaf',type:Pi(C('IdxNIC35'),App(C('ParamTreeNIC35'),B(0)))},
  {name:'ParamTreeNIC35.node',type:Pi(C('IdxNIC35'),Pi(Apps(C('VecNIC35'),[App(C('ParamTreeNIC35'),B(0)),B(0)]),App(C('ParamTreeNIC35'),B(1))))},
]};
{
  const e=env35();for(const d of [Idx,z,s,Vec])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,ParamTree);assert.ok(checked.generated.includes('ParamTreeNIC35.rec_1'));
  const h=e.get('ParamTreeNIC35.rec_1').declaration;assert.equal(h.metadata.numParams,1);assert.equal(h.metadata.numIndices,1);assert.deepEqual(h.metadata.mutual.indexCounts,[0,1]);
}

// Historical v34 keeps indexed nested containers unavailable.
{
  const e=env34();for(const d of [Idx,z,s,Vec])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Tree),/exactly one parameter and no indices|nested container|positive occurrence/i);assert.equal(e.has('TreeNIC35'),false);
}

// Strict v35 codec/replay and profile isolation.
{
  const declarations=[Idx,z,s,Vec,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-indexed-containers0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-polymorphic0'),/no indices|nested container|positive occurrence/i);
  const artifact=makeKernelNestedIndexedContainersArtifact(declarations);assert.equal(artifact.formatVersion,35);assert.equal(artifact.implementationProfile,'KERNEL-nested-indexed-containers0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:34}),/unsupported v34 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-polymorphic0'}),/unsupported v35 implementation profile/);
  const historical=makeKernelNestedPolymorphicArtifact([Idx,z,s,Vec]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/no indices|nested container|positive occurrence/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-indexed-container-v35-')),file=path.join(dir,'v35.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['IdxNIC35','zNIC35','sNIC35']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-indexed-v35-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`axiom Idx : Type\naxiom z : Idx\naxiom s : Idx → Idx\ninductive Vec (α : Type) : Idx → Type where\n| nil : Vec α z\n| cons : (i : Idx) → α → Vec α i → Vec α (s i)\ninductive Tree : Type where\n| leaf : Tree\n| node : (i : Idx) → Vec Tree i → Tree\n#print Tree.rec\n#check Tree.rec_1\ninductive ParamTree (p : Idx) : Type where\n| leaf : ParamTree p\n| node : Vec (ParamTree p) p → ParamTree p\n#print ParamTree.rec\n#check ParamTree.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/motive_2 : \(a : Idx\) → Vec Tree a → Sort/);assert.match(gr.stdout,/Tree\.rec_1/);assert.match(gr.stdout,/ParamTree\.rec_1/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_INDEXED_CONTAINERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-indexed-containers0',coreFormat:35,status:'accepted',supportedSlice:'v34-compatible one-level nested preprocessing through an already-checked one-parameter indexed container whose index telescope is independent of the recursive outer family',observations:{indexedContainerMotive:'accepted',recursiveIndexedContainerIota:'accepted',constructorLocalContainerIndex:'accepted',uniformParameterContainerIndex:'accepted',serializedReplay:'accepted'},historicalIsolation:{v34IndexedContainerNested:'rejected'},explicitGaps:{containerIndexDomainsDependingOnOuter:'unsupported',multipleContainerParameters:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v35 indexed nested-container preprocessing, indexed helper motive/iota, parameter/local indices, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
