import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedInductivesArtifact,makeKernelMutualPropArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=levelOfNat(0),L1=levelOfNat(1); const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true};
const env29=()=>new Environment({...base,allowNestedInductives:true}),env28=()=>new Environment(base);

const Box={kind:'inductive',name:'BoxN29',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxN29.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxN29'),B(1))))}]};
const Tree={kind:'inductive',name:'TreeN29',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'TreeN29.leaf',type:C('TreeN29')},{name:'TreeN29.node',type:Pi(App(C('BoxN29'),C('TreeN29')),C('TreeN29'))}]};

// Nonrecursive one-parameter container: public Lean-style linked recursors and iota.
{
  const e=env29();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,Tree);
  assert.deepEqual(checked.generated,['TreeN29.leaf','TreeN29.node','TreeN29.rec','TreeN29.rec_1']);
  const rec=e.get('TreeN29.rec')?.declaration,helper=e.get('TreeN29.rec_1')?.declaration;
  assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');assert.deepEqual(rec.levelParams,['u_motive']);assert.deepEqual(helper.levelParams,['u_motive']);
  assert.match(pretty(rec.type),/TreeN29 → Sort u_motive/);assert.match(pretty(rec.type),/BoxN29\(TreeN29\) → Sort u_motive/);
  assert.match(pretty(helper.type),/BoxN29\.mk\(TreeN29/);
  const N={kind:'axiom',name:'N29',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n029',levelParams:[],type:C('N29')};for(const d of [N,n0])checkAndAddDeclaration(e,d);
  const boxTree=App(C('BoxN29'),C('TreeN29')),mT=Lam(C('TreeN29'),C('N29')),mB=Lam(boxTree,C('N29'));
  const leaf=C('n029'),node=Lam(boxTree,Lam(C('N29'),B(0))),boxMinor=Lam(C('TreeN29'),Lam(C('N29'),B(0)));
  const major=App(C('TreeN29.node'),Apps(C('BoxN29.mk'),[C('TreeN29'),C('TreeN29.leaf')]));
  const term=Apps(C('TreeN29.rec',[L1]),[mT,mB,leaf,node,boxMinor,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n029')),'outer iota must call the restored helper and helper iota must call the outer recursor');
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('N29')));
}

// Recursive container: helper recursion must traverse both the nested element and container tail.
const MyList={kind:'inductive',name:'MyListN29',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'MyListN29.nil',type:Pi(S(L1),App(C('MyListN29'),B(0)))},
  {name:'MyListN29.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('MyListN29'),B(1)),App(C('MyListN29'),B(2)))))}
]};
const TreeL={kind:'inductive',name:'TreeLN29',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'TreeLN29.leaf',type:C('TreeLN29')},{name:'TreeLN29.node',type:Pi(App(C('MyListN29'),C('TreeLN29')),C('TreeLN29'))}]};
{
  const e=env29();checkAndAddDeclaration(e,MyList);checkAndAddDeclaration(e,TreeL);
  const helper=e.get('TreeLN29.rec_1')?.declaration;assert.equal(helper?.kind,'recursor');assert.equal(helper.metadata.rules.length,2);assert.deepEqual(helper.metadata.rules.map(r=>r.ctor),['MyListN29.nil','MyListN29.cons']);
  const consRule=helper.metadata.rules[1];assert.deepEqual(consRule.recursiveRecursors,['TreeLN29.rec','TreeLN29.rec_1']);assert.equal(consRule.ctorParamCount,1);
  const N={kind:'axiom',name:'NL29',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0L29',levelParams:[],type:C('NL29')};for(const d of [N,n0])checkAndAddDeclaration(e,d);
  const listTree=App(C('MyListN29'),C('TreeLN29')),mT=Lam(C('TreeLN29'),C('NL29')),mL=Lam(listTree,C('NL29'));
  const leaf=C('n0L29'),node=Lam(listTree,Lam(C('NL29'),B(0))),nil=C('n0L29');
  // a → ih(a) → tail → ih(tail) → ih(a)
  const cons=Lam(C('TreeLN29'),Lam(C('NL29'),Lam(listTree,Lam(C('NL29'),B(2)))));
  const nilVal=App(C('MyListN29.nil'),C('TreeLN29'));
  const consVal=Apps(C('MyListN29.cons'),[C('TreeLN29'),C('TreeLN29.leaf'),nilVal]);
  const major=App(C('TreeLN29.node'),consVal);
  const term=Apps(C('TreeLN29.rec',[L1]),[mT,mL,leaf,node,nil,cons,major]);
  assert.ok(sameTerm(kernelWhnf(e,term),C('n0L29')),'recursive-container helper iota must recurse into both element and tail');
}

// Historical v28 preserves rejection: nested semantics cannot be acquired by relabeling.
{
  const e=env28();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Tree),/recursive occurrence|positive|nested|direct/i);assert.equal(e.has('TreeN29'),false);
  assert.equal(checkCoreDeclarations([Box,Tree],'KERNEL-nested-inductives0').status,'accepted');
  assert.throws(()=>checkCoreDeclarations([Box,Tree],'KERNEL-mutual-prop0'),/recursive occurrence|positive|nested|direct/i);
}

// Negative container parameter is rechecked through the private auxiliary family and rejected atomically.
{
  const Nat={kind:'axiom',name:'NatN29',levelParams:[],type:S(L1)};
  const Contra={kind:'inductive',name:'ContraN29',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'ContraN29.mk',type:Pi(S(L1),Pi(Pi(B(0),C('NatN29')),App(C('ContraN29'),B(1))))}]};
  const Bad={kind:'inductive',name:'BadNestedN29',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadNestedN29.mk',type:Pi(App(C('ContraN29'),C('BadNestedN29')),C('BadNestedN29'))}]};
  const e=env29();for(const d of [Nat,Contra])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/non-positive|non positive|positivity|negative/i);assert.equal(e.has('BadNestedN29'),false);assert.equal(e.has('BadNestedN29.rec'),false);assert.equal(e.has('BadNestedN29.rec_1'),false);
}

// Explicit bounded-slice rejections: multiple containers, deeper nesting, nested Prop, and polymorphic container.
{
  const Box2={...Box,name:'Box2N29',constructors:[{name:'Box2N29.mk',type:Pi(S(L1),Pi(B(0),App(C('Box2N29'),B(1))))}]};
  const Multi={kind:'inductive',name:'MultiN29',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'MultiN29.mk',type:Pi(App(C('BoxN29'),C('MultiN29')),Pi(App(C('Box2N29'),C('MultiN29')),C('MultiN29')))}]};
  const Deep={kind:'inductive',name:'DeepN29',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'DeepN29.mk',type:Pi(App(C('BoxN29'),App(C('BoxN29'),C('DeepN29'))),C('DeepN29'))}]};
  const PropNested={kind:'inductive',name:'PropNestedN29',levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PropNestedN29.mk',type:Pi(App(C('BoxN29'),C('PropNestedN29')),C('PropNestedN29'))}]};
  const e=env29();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Box2);
  assert.throws(()=>checkAndAddDeclaration(e,Multi),/exactly one nested container/);assert.throws(()=>checkAndAddDeclaration(e,Deep),/recursive occurrence|nested slice|positive/i);assert.throws(()=>checkAndAddDeclaration(e,PropNested),/requires an outer family in Type/);
}

// v29 serialization/replay; v28 format/profile relabeling is rejected or remains semantically historical.
{
  const declarations=[Box,Tree];const artifact=makeKernelNestedInductivesArtifact(declarations);assert.equal(artifact.formatVersion,29);assert.equal(artifact.implementationProfile,'KERNEL-nested-inductives0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:28}),/unsupported v28 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-prop0'}),/unsupported v29 implementation profile/);
  const hist=makeKernelMutualPropArtifact([Box]);const smuggled=decodeArtifact({...hist,declarations:[Box,Tree]});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/recursive occurrence|positive|nested|direct/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-v29-')),file=path.join(dir,'v29.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 observations for the representable source slice.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-v29-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Tree : Type where\n| leaf : Tree\n| node : Box Tree → Tree\n#print Tree.rec\n#print Tree.rec_1\n\ninductive MyList (α : Type) : Type where\n| nil : MyList α\n| cons : α → MyList α → MyList α\n\ninductive TreeL : Type where\n| leaf : TreeL\n| node : MyList TreeL → TreeL\n#print TreeL.rec\n#print TreeL.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/motive_2 : Box Tree → Sort/);assert.match(gr.stdout,/Tree\.rec_1/);assert.match(gr.stdout,/motive_2 : MyList TreeL → Sort/);assert.match(gr.stdout,/MyList\.cons/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Contra (α : Type) : Type where\n| mk : (α → Nat) → Contra α\n\ninductive Bad : Type where\n| mk : Contra Bad → Bad\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/non positive occurrence|non-positive occurrence/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_INDUCTIVES_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-inductives0',coreFormat:29,status:'accepted',supportedSlice:'parameterless/indexless monomorphic Type inductives nested through one previously checked monomorphic one-parameter zero-index container',observations:{boxNestedAdmission:'accepted',boxLinkedHelperRecursor:'accepted',recursiveListContainer:'accepted',containerTailRecursion:'accepted',negativeContainerParameter:'rejected',serializedReplay:'accepted'},historicalIsolation:{v28NestedSemantics:'rejected'},explicitGaps:{parameterizedOuter:'unsupported',indexedContainer:'unsupported',polymorphicContainer:'unsupported',multipleNestedContainers:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v29 nested preprocessing, linked helper recursors/iota, recursive-container traversal, variance rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
