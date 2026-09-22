import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import{spawnSync}from'node:child_process';
import{Environment,checkAndAddDeclaration,checkCoreDeclarations,kernelWhnf,infer,levelOfNat,levelParam,levelSucc,pretty,sameTerm}from'../packages/kernel/dist/index.js';
import{decodeArtifact,makeKernelNestedDeeperDependentContainerParametersArtifact,makeKernelNestedDeeperMultiParameterGeneralizationArtifact}from'../packages/kernel-codec/dist/index.js';
import{verifyFile}from'../packages/verifier/dist/index.js';
const L1=levelOfNat(1),U=levelParam('u'),TU={tag:'sort',level:levelSucc(U)},S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true};
const env46=()=>new Environment({...base,allowNestedDeeperDependentContainerParameters:true}),env45=()=>new Environment(base);
const Nat={kind:'axiom',name:'NatDCP46',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0DCP46',levelParams:[],type:C('NatDCP46')};
const Bool={kind:'axiom',name:'BoolDCP46',levelParams:[],type:S(L1)},Out={kind:'axiom',name:'OutDCP46',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0DCP46',levelParams:[],type:C('OutDCP46')};
const DepBi={kind:'inductive',name:'DepBiDCP46',levelParams:[],type:Pi(S(L1),Pi(Pi(B(0),S(L1)),S(L1))),numParams:2,numIndices:0,constructors:[
 {name:'DepBiDCP46.mk',type:Pi(S(L1),Pi(Pi(B(0),S(L1)),Pi(B(1),Pi(App(B(1),B(0)),Apps(C('DepBiDCP46'),[B(3),B(2)])))))}
]};
const DB=(a,b)=>Apps(C('DepBiDCP46'),[a,b]);
const Bi={kind:'inductive',name:'BiDCP46',levelParams:[],type:Pi(S(L1),Pi(S(L1),S(L1))),numParams:2,numIndices:0,constructors:[
 {name:'BiDCP46.mk',type:Pi(S(L1),Pi(S(L1),Pi(B(1),Pi(B(1),Apps(C('BiDCP46'),[B(3),B(2)])))))}
]};
const BI=(a,b)=>Apps(C('BiDCP46'),[a,b]);
const tree=(name,field)=>({kind:'inductive',name,levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:`${name}.leaf`,type:C(name)},{name:`${name}.node`,type:Pi(field,C(name))}]});
const first=tree('TreeFirstDCP46',DB(C('TreeFirstDCP46'),Lam(C('TreeFirstDCP46'),C('NatDCP46'))));
const second=tree('TreeSecondDCP46',DB(C('NatDCP46'),Lam(C('NatDCP46'),C('TreeSecondDCP46'))));
const both=tree('TreeBothDCP46',DB(C('TreeBothDCP46'),Lam(C('TreeBothDCP46'),C('TreeBothDCP46'))));
const inner=DB(C('TreeDeepDCP46'),Lam(C('TreeDeepDCP46'),C('NatDCP46'))),deep=tree('TreeDeepDCP46',DB(inner,Lam(inner,C('BoolDCP46'))));
const nested=tree('TreeNestedDCP46',DB(C('NatDCP46'),Lam(C('NatDCP46'),BI(C('TreeNestedDCP46'),C('NatDCP46')))));
const negative=tree('TreeNegativeDCP46',DB(C('NatDCP46'),Lam(C('NatDCP46'),Pi(C('TreeNegativeDCP46'),C('NatDCP46')))));

// Direct dependent parameter positions and exact IH counts.
{
 const e=env46();for(const d of [Nat,DepBi])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,first);const h=e.get('TreeFirstDCP46.rec_1').declaration;assert.deepEqual(h.metadata.rules[0].recursiveRecursors,['TreeFirstDCP46.rec',null]);
}
{
 const e=env46();for(const d of [Nat,DepBi])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,second);const h=e.get('TreeSecondDCP46.rec_1').declaration;assert.deepEqual(h.metadata.rules[0].recursiveRecursors,[null,'TreeSecondDCP46.rec']);
}
// Recursion in both dependent parameter positions + actual linked iota.
{
 const e=env46();for(const d of [Nat,Out,out0,DepBi])checkAndAddDeclaration(e,d);const c=checkAndAddDeclaration(e,both);assert.deepEqual(c.generated,['TreeBothDCP46.leaf','TreeBothDCP46.node','TreeBothDCP46.rec','TreeBothDCP46.rec_1']);
 const h=e.get('TreeBothDCP46.rec_1').declaration;assert.deepEqual(h.metadata.rules[0].recursiveRecursors,['TreeBothDCP46.rec','TreeBothDCP46.rec']);assert.equal(h.metadata.rules[0].ctorParamCount,2);
 const T=C('TreeBothDCP46'),D=DB(T,Lam(T,T)),O=C('OutDCP46');const mT=Lam(T,O),mD=Lam(D,O),leaf=C('out0DCP46'),node=Lam(D,Lam(O,B(0))),mk=Lam(T,Lam(T,Lam(O,Lam(O,B(1)))));
 const l=C('TreeBothDCP46.leaf'),dm=Apps(C('DepBiDCP46.mk'),[T,Lam(T,T),l,l]),major=App(C('TreeBothDCP46.node'),dm);const term=Apps(C('TreeBothDCP46.rec',[L1]),[mT,mD,leaf,node,mk,major]);const r=kernelWhnf(e,term);assert.ok(sameTerm(r,C('out0DCP46')),`dependent both-position iota mismatch: ${pretty(r)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),O));
}
// Deep dependent chain creates one helper per specialized family.
{
 const e=env46();for(const d of [Nat,Bool,DepBi])checkAndAddDeclaration(e,d);const c=checkAndAddDeclaration(e,deep);assert.deepEqual(c.generated.slice(-3),['TreeDeepDCP46.rec','TreeDeepDCP46.rec_1','TreeDeepDCP46.rec_2']);assert.deepEqual(e.get('TreeDeepDCP46.rec_1').declaration.metadata.rules[0].recursiveRecursors,['TreeDeepDCP46.rec_2',null]);assert.deepEqual(e.get('TreeDeepDCP46.rec_2').declaration.metadata.rules[0].recursiveRecursors,['TreeDeepDCP46.rec',null]);
}
// Nested specialization under a dependent lambda is discovered and linked; actual 3-motive iota.
{
 const e=env46();for(const d of [Nat,n0,Out,out0,DepBi,Bi])checkAndAddDeclaration(e,d);const c=checkAndAddDeclaration(e,nested);assert.deepEqual(c.generated.slice(-3),['TreeNestedDCP46.rec','TreeNestedDCP46.rec_1','TreeNestedDCP46.rec_2']);
 const h1=e.get('TreeNestedDCP46.rec_1').declaration,h2=e.get('TreeNestedDCP46.rec_2').declaration;assert.deepEqual(h1.metadata.rules[0].recursiveRecursors,[null,'TreeNestedDCP46.rec_2']);assert.deepEqual(h2.metadata.rules[0].recursiveRecursors,['TreeNestedDCP46.rec',null]);
 const T=C('TreeNestedDCP46'),BT=BI(T,C('NatDCP46')),fam=Lam(C('NatDCP46'),BT),D=DB(C('NatDCP46'),fam),O=C('OutDCP46');const mT=Lam(T,O),mD=Lam(D,O),mB=Lam(BT,O),leaf=C('out0DCP46'),node=Lam(D,Lam(O,B(0))),dmk=Lam(C('NatDCP46'),Lam(BT,Lam(O,B(0)))),bmk=Lam(T,Lam(C('NatDCP46'),Lam(O,B(0))));
 const l=C('TreeNestedDCP46.leaf'),bv=Apps(C('BiDCP46.mk'),[T,C('NatDCP46'),l,C('n0DCP46')]),dv=Apps(C('DepBiDCP46.mk'),[C('NatDCP46'),fam,C('n0DCP46'),bv]),major=App(C('TreeNestedDCP46.node'),dv);const term=Apps(C('TreeNestedDCP46.rec',[L1]),[mT,mD,mB,leaf,node,dmk,bmk,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0DCP46')));
}
// Negative dependent family still fails strict positivity.
{
 const e=env46();for(const d of [Nat,DepBi])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,negative),/positive|recursive/i);assert.equal(e.has('TreeNegativeDCP46'),false);
}
// Dependent container parameter family composes with an outer uniform parameter.
const PTree={kind:'inductive',name:'PTreeDCP46',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'PTreeDCP46.leaf',type:Pi(S(L1),Pi(B(0),App(C('PTreeDCP46'),B(1))))},
 {name:'PTreeDCP46.node',type:Pi(S(L1),Pi(DB(C('NatDCP46'),Lam(C('NatDCP46'),App(C('PTreeDCP46'),B(1)))),App(C('PTreeDCP46'),B(1))))}
]};
{
 const e=env46();for(const d of [Nat,DepBi])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,PTree);const r=e.get('PTreeDCP46.rec').declaration;assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.mutual.motiveCount,2);
}
// Explicit universe-polymorphic dependent container parameter telescope.
const UDepBi={kind:'inductive',name:'UDepBiDCP46',levelParams:['u'],type:Pi(TU,Pi(Pi(B(0),TU),TU)),numParams:2,numIndices:0,constructors:[
 {name:'UDepBiDCP46.mk',type:Pi(TU,Pi(Pi(B(0),TU),Pi(B(1),Pi(App(B(1),B(0)),Apps(C('UDepBiDCP46',[U]),[B(3),B(2)])))))}
]};
const UDB=(a,b)=>Apps(C('UDepBiDCP46',[U]),[a,b]);
const UTree={kind:'inductive',name:'UTreeDCP46',levelParams:['u'],type:TU,numParams:0,numIndices:0,constructors:[{name:'UTreeDCP46.leaf',type:C('UTreeDCP46',[U])},{name:'UTreeDCP46.node',type:Pi(UDB(C('UTreeDCP46',[U]),Lam(C('UTreeDCP46',[U]),C('UTreeDCP46',[U]))),C('UTreeDCP46',[U]))}]};
{
 const e=env46();checkAndAddDeclaration(e,UDepBi);checkAndAddDeclaration(e,UTree);const r=e.get('UTreeDCP46.rec').declaration;assert.deepEqual(r.levelParams.slice(1),['u']);assert.equal(r.metadata.mutual.motiveCount,2);
}
// Strict Core 46 replay and historical v45 isolation.
{
 const declarations=[Nat,DepBi,second];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-dependent-container-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multi-parameter-generalization0'),/nested|parameter|positive|recursive|type mismatch/i);
 const artifact=makeKernelNestedDeeperDependentContainerParametersArtifact(declarations);assert.equal(artifact.formatVersion,46);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-dependent-container-parameters0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:45}),/unsupported v45 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-multi-parameter-generalization0'}),/unsupported v46 implementation profile/);
 const historical=makeKernelNestedDeeperMultiParameterGeneralizationArtifact([Nat,DepBi]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/nested|parameter|positive|recursive|type mismatch/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v46-')),file=path.join(dir,'v46.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatDCP46']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v46-lean-')),good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Bi (A B : Type) : Type where | mk : A → B → Bi A B\ninductive DepBi (A : Type) (B : A → Type) : Type where | mk (a : A) (b : B a) : DepBi A B\ninductive First : Type where | leaf : First | node : DepBi First (fun _ => Nat) → First\n#print First.rec\ninductive Second : Type where | leaf : Second | node : DepBi Nat (fun _ => Second) → Second\n#print Second.rec\ninductive Both : Type where | leaf : Both | node : DepBi Both (fun _ => Both) → Both\n#print Both.rec\ninductive Deep : Type where | leaf : Deep | node : DepBi (DepBi Deep (fun _ => Nat)) (fun _ => Bool) → Deep\n#print Deep.rec\ninductive Nested : Type where | leaf : Nested | node : DepBi Nat (fun _ => Bi Nested Nat) → Nested\n#print Nested.rec\ninductive PTree (α : Type) : Type where | leaf : α → PTree α | node : DepBi Nat (fun _ => PTree α) → PTree α\n#print PTree.rec\ninductive UDepBi.{u} (A : Type u) (B : A → Type u) : Type u where | mk (a : A) (b : B a) : UDepBi A B\ninductive UTree.{u} : Type u where | leaf : UTree | node : UDepBi UTree (fun _ => UTree) → UTree\n#print UTree.rec\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);const out=gr.stdout;assert.match(out,/\(a : Both\).*motive_1 a.*motive_1 b/s);assert.match(out,/number of motives: 3/);assert.match(out,/Bi Nested Nat/);assert.match(out,/PTree α/);assert.match(out,/UTree\.rec\.\{u_1, u\}/);
 const bad=path.join(dir,'Negative.lean');fs.writeFileSync(bad,`inductive DepBi (A : Type) (B : A → Type) : Type where | mk (a : A) (b : B a) : DepBi A B\ninductive Bad : Type where | leaf : Bad | node : DepBi Nat (fun _ => Bad → Nat) → Bad\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/non positive occurrence/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_DEPENDENT_CONTAINER_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-dependent-container-parameters0',coreFormat:46,status:'accepted',supportedSlice:'dependent nested-container parameter telescopes composed with the v45 generalized multi-parameter graph; recursive occurrences may appear in later dependent parameter families and nested specializations under binder terms when projectable to the shared outer context; positivity remains checked by the synthetic mutual kernel path',observations:{recursiveFirstParameter:'accepted',recursiveLaterDependentParameter:'accepted',recursiveBothDependentPositions:'accepted',deepDependentChain:'accepted',nestedSpecializationUnderLambda:'accepted',negativeDependentFamily:'rejected',outerParameters:'accepted',explicitUniverses:'accepted',linkedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v45DependentParameterFamily:'rejected'},explicitGaps:{parameterLocalNestedSpecializations:'Lean-local-variable-boundary',remainingGeneralNestedEdges:'needs audit',remainingGeneralRecursorEdges:'partial',resourceHardening:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v46 dependent nested-container parameter telescopes, dependent IH placement, nested-under-lambda helper discovery, linked iota, positivity rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean unavailable)'}`);
