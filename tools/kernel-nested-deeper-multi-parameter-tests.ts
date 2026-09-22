import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import{spawnSync}from'node:child_process';
import{Environment,checkAndAddDeclaration,checkCoreDeclarations,kernelWhnf,infer,levelOfNat,pretty,sameTerm}from'../packages/kernel/dist/index.js';
import{decodeArtifact,makeKernelNestedDeeperMultiParameterArtifact,makeKernelNestedDeeperPropArtifact}from'../packages/kernel-codec/dist/index.js';
import{verifyFile}from'../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true};
const env44=()=>new Environment({...base,allowNestedDeeperMultiParameter:true}),env43=()=>new Environment(base);
const Nat={kind:'axiom',name:'NatNMP44',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0NMP44',levelParams:[],type:C('NatNMP44')};
const Bool={kind:'axiom',name:'BoolNMP44',levelParams:[],type:S(L1)},b0={kind:'axiom',name:'b0NMP44',levelParams:[],type:C('BoolNMP44')};
const Out={kind:'axiom',name:'OutNMP44',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0NMP44',levelParams:[],type:C('OutNMP44')};
const Bi={kind:'inductive',name:'BiNMP44',levelParams:[],type:Pi(S(L1),Pi(S(L1),S(L1))),numParams:2,numIndices:0,constructors:[
 {name:'BiNMP44.mk',type:Pi(S(L1),Pi(S(L1),Pi(B(1),Pi(B(1),Apps(C('BiNMP44'),[B(3),B(2)])))))}]};
const BI=(a,b)=>Apps(C('BiNMP44'),[a,b]);
const TreeFirst={kind:'inductive',name:'TreeFirstNMP44',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
 {name:'TreeFirstNMP44.leaf',type:C('TreeFirstNMP44')},{name:'TreeFirstNMP44.node',type:Pi(BI(C('TreeFirstNMP44'),C('NatNMP44')),C('TreeFirstNMP44'))}]};
{
 const e=env44();for(const d of [Nat,n0,Out,out0,Bi])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,TreeFirst);const rec=e.get('TreeFirstNMP44.rec').declaration,h=e.get('TreeFirstNMP44.rec_1').declaration;
 assert.deepEqual(checked.generated,['TreeFirstNMP44.leaf','TreeFirstNMP44.node','TreeFirstNMP44.rec','TreeFirstNMP44.rec_1']);assert.equal(rec.metadata.mutual.motiveCount,2);
 assert.deepEqual(h.metadata.rules[0].recursiveRecursors,['TreeFirstNMP44.rec',null]);assert.equal(h.metadata.rules[0].ctorParamCount,2);
 const T=C('TreeFirstNMP44'),BT=BI(T,C('NatNMP44')),O=C('OutNMP44');const mT=Lam(T,O),mB=Lam(BT,O),leaf=C('out0NMP44');
 const node=Lam(BT,Lam(O,B(0)));const mk=Lam(T,Lam(C('NatNMP44'),Lam(O,B(0))));const elem=Apps(C('BiNMP44.mk'),[T,C('NatNMP44'),C('TreeFirstNMP44.leaf'),C('n0NMP44')]);const major=App(C('TreeFirstNMP44.node'),elem);
 const term=Apps(C('TreeFirstNMP44.rec',[L1]),[mT,mB,leaf,node,mk,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0NMP44')),`v44 first-param linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),O));
}
const TreeSecond={kind:'inductive',name:'TreeSecondNMP44',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
 {name:'TreeSecondNMP44.leaf',type:C('TreeSecondNMP44')},{name:'TreeSecondNMP44.node',type:Pi(BI(C('NatNMP44'),C('TreeSecondNMP44')),C('TreeSecondNMP44'))}]};
{
 const e=env44();for(const d of [Nat,Bi])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TreeSecond);const h=e.get('TreeSecondNMP44.rec_1').declaration;assert.deepEqual(h.metadata.rules[0].recursiveRecursors,[null,'TreeSecondNMP44.rec']);
}
const TreeBoth={kind:'inductive',name:'TreeBothNMP44',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
 {name:'TreeBothNMP44.leaf',type:C('TreeBothNMP44')},{name:'TreeBothNMP44.node',type:Pi(BI(C('TreeBothNMP44'),C('TreeBothNMP44')),C('TreeBothNMP44'))}]};
{
 const e=env44();checkAndAddDeclaration(e,Bi);checkAndAddDeclaration(e,TreeBoth);const h=e.get('TreeBothNMP44.rec_1').declaration;assert.deepEqual(h.metadata.rules[0].recursiveRecursors,['TreeBothNMP44.rec','TreeBothNMP44.rec']);assert.match(pretty(e.get('TreeBothNMP44.rec').declaration.type),/BiNMP44\(TreeBothNMP44, TreeBothNMP44\)/);
}
const TreeDeep={kind:'inductive',name:'TreeDeepNMP44',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
 {name:'TreeDeepNMP44.leaf',type:C('TreeDeepNMP44')},{name:'TreeDeepNMP44.node',type:Pi(BI(BI(C('TreeDeepNMP44'),C('NatNMP44')),C('BoolNMP44')),C('TreeDeepNMP44'))}]};
{
 const e=env44();for(const d of [Nat,Bool,Bi])checkAndAddDeclaration(e,d);const c=checkAndAddDeclaration(e,TreeDeep);assert.deepEqual(c.generated,['TreeDeepNMP44.leaf','TreeDeepNMP44.node','TreeDeepNMP44.rec','TreeDeepNMP44.rec_1','TreeDeepNMP44.rec_2']);assert.deepEqual(e.get('TreeDeepNMP44.rec_1').declaration.metadata.rules[0].recursiveRecursors,['TreeDeepNMP44.rec_2',null]);assert.deepEqual(e.get('TreeDeepNMP44.rec_2').declaration.metadata.rules[0].recursiveRecursors,['TreeDeepNMP44.rec',null]);
}
const BiList={kind:'inductive',name:'BiListNMP44',levelParams:[],type:Pi(S(L1),Pi(S(L1),S(L1))),numParams:2,numIndices:0,constructors:[
 {name:'BiListNMP44.nil',type:Pi(S(L1),Pi(S(L1),Apps(C('BiListNMP44'),[B(1),B(0)])))},
 {name:'BiListNMP44.consA',type:Pi(S(L1),Pi(S(L1),Pi(B(1),Pi(Apps(C('BiListNMP44'),[B(2),B(1)]),Apps(C('BiListNMP44'),[B(3),B(2)])))))},
 {name:'BiListNMP44.consB',type:Pi(S(L1),Pi(S(L1),Pi(B(0),Pi(Apps(C('BiListNMP44'),[B(2),B(1)]),Apps(C('BiListNMP44'),[B(3),B(2)])))))}]};
const BL=(a,b)=>Apps(C('BiListNMP44'),[a,b]);
const TreeList={kind:'inductive',name:'TreeListNMP44',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'TreeListNMP44.leaf',type:C('TreeListNMP44')},{name:'TreeListNMP44.node',type:Pi(BL(C('TreeListNMP44'),C('TreeListNMP44')),C('TreeListNMP44'))}]};
{
 const e=env44();checkAndAddDeclaration(e,BiList);checkAndAddDeclaration(e,TreeList);const h=e.get('TreeListNMP44.rec_1').declaration;assert.deepEqual(h.metadata.rules[1].recursiveRecursors,['TreeListNMP44.rec','TreeListNMP44.rec_1']);assert.deepEqual(h.metadata.rules[2].recursiveRecursors,['TreeListNMP44.rec','TreeListNMP44.rec_1']);
}
// v43 retains its one-parameter boundary; v44 serialization/replay is strict.
{
 const declarations=[Nat,Bi,TreeFirst];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multi-parameter0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-prop0'),/nested|positive|recursive|container|parameter/i);
 const artifact=makeKernelNestedDeeperMultiParameterArtifact(declarations);assert.equal(artifact.formatVersion,44);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-multi-parameter0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:43}),/unsupported v43 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-prop0'}),/unsupported v44 implementation profile/);
 const historical=makeKernelNestedDeeperPropArtifact([Nat,Bi]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/nested|positive|recursive|container|parameter/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-multiparam-v44-')),file=path.join(dir,'v44.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatNMP44']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-multiparam-v44-lean-')),good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Bi (α β : Type) : Type where\n| mk : α → β → Bi α β\ninductive A : Type where | leaf : A | node : Bi A Nat → A\n#print A.rec\ninductive B : Type where | leaf : B | node : Bi Nat B → B\n#print B.rec\ninductive C : Type where | leaf : C | node : Bi C C → C\n#print C.rec\ninductive D : Type where | leaf : D | node : Bi (Bi D Nat) Bool → D\n#print D.rec\n`);const r=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/Bi A Nat/);assert.match(r.stdout,/Bi Nat B/);assert.match(r.stdout,/motive_1 a → motive_1 a_1 → motive_2 \(Bi\.mk a a_1\)/);assert.match(r.stdout,/number of motives: 3/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_MULTI_PARAMETER_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-multi-parameter0',coreFormat:44,status:'accepted',supportedSlice:'monomorphic parameterless/indexless Type outer families with arbitrary-depth/multiple-field zero-index nested containers whose full parameter vectors may contain recursion in any positions',observations:{firstParameter:'accepted',laterParameter:'accepted',multipleRecursiveParameters:'accepted',deepNestedParameter:'accepted',recursiveTwoParameterContainer:'accepted',linkedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v43MultiParameter:'rejected'},explicitGaps:{outerParametersIndicesUniversesWithMultiParameterContainers:'unsupported',multiParameterNestedProp:'unsupported',indexedMultiParameterContainers:'unsupported',remainingGeneralRecursorEdges:'partial',resourceHardening:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v44 bounded multi-parameter nested-container graph, multi-position IHs, deep specialization, linked iota, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
