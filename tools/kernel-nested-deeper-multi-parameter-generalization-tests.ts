import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import{spawnSync}from'node:child_process';
import{Environment,checkAndAddDeclaration,checkCoreDeclarations,kernelWhnf,infer,levelOfNat,levelParam,levelSucc,LevelZero,pretty,sameTerm}from'../packages/kernel/dist/index.js';
import{decodeArtifact,makeKernelNestedDeeperMultiParameterGeneralizationArtifact,makeKernelNestedDeeperMultiParameterArtifact}from'../packages/kernel-codec/dist/index.js';
import{verifyFile}from'../packages/verifier/dist/index.js';
const L1=levelOfNat(1),U=levelParam('u'),TU={tag:'sort',level:levelSucc(U)},Prop={tag:'sort',level:LevelZero};
const S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true};
const env45=()=>new Environment({...base,allowNestedDeeperMultiParameterGeneralization:true}),env44=()=>new Environment(base);
const Nat={kind:'axiom',name:'NatNMPG45',levelParams:[],type:S(L1)},zero={kind:'axiom',name:'zeroNMPG45',levelParams:[],type:C('NatNMPG45')},one={kind:'axiom',name:'oneNMPG45',levelParams:[],type:C('NatNMPG45')};
const Out={kind:'axiom',name:'OutNMPG45',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0NMPG45',levelParams:[],type:C('OutNMPG45')};
const Bi={kind:'inductive',name:'BiNMPG45',levelParams:[],type:Pi(S(L1),Pi(S(L1),S(L1))),numParams:2,numIndices:0,constructors:[
 {name:'BiNMPG45.mk',type:Pi(S(L1),Pi(S(L1),Pi(B(1),Pi(B(1),Apps(C('BiNMPG45'),[B(3),B(2)])))))}]};
const BI=(a,b)=>Apps(C('BiNMPG45'),[a,b]);
const Tree={kind:'inductive',name:'TreeNMPG45',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'TreeNMPG45.leaf',type:Pi(S(L1),Pi(B(0),App(C('TreeNMPG45'),B(1))))},
 {name:'TreeNMPG45.node',type:Pi(S(L1),Pi(BI(App(C('TreeNMPG45'),B(0)),B(0)),App(C('TreeNMPG45'),B(1))))}
]};
// outer parameters + actual linked iota through a two-parameter helper.
{
 const e=env45();for(const d of [Out,out0,Bi])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Tree);assert.deepEqual(checked.generated,['TreeNMPG45.leaf','TreeNMPG45.node','TreeNMPG45.rec','TreeNMPG45.rec_1']);
 const h=e.get('TreeNMPG45.rec_1').declaration;assert.equal(h.metadata.rules[0].ctorParamCount,2);assert.deepEqual(h.metadata.rules[0].recursiveRecursors,['TreeNMPG45.rec',null]);
 const A=C('OutNMPG45'),T=App(C('TreeNMPG45'),A),BT=BI(T,A),O=C('OutNMPG45');const mT=Lam(T,O),mB=Lam(BT,O);
 const leaf=Lam(A,C('out0NMPG45')),node=Lam(BT,Lam(O,B(0))),mk=Lam(T,Lam(A,Lam(O,B(0))));
 const lm=Apps(C('TreeNMPG45.leaf'),[A,C('out0NMPG45')]),bm=Apps(C('BiNMPG45.mk'),[T,A,lm,C('out0NMPG45')]),major=Apps(C('TreeNMPG45.node'),[A,bm]);
 const term=Apps(C('TreeNMPG45.rec',[L1]),[A,mT,mB,leaf,node,mk,major]);const r=kernelWhnf(e,term);assert.ok(sameTerm(r,C('out0NMPG45')),`v45 parameterized multi-param iota mismatch: ${pretty(r)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),O));
}
// fixed indexed outer specialization remains indexed.
const Fixed={kind:'inductive',name:'FixedNMPG45',levelParams:[],type:Pi(S(L1),Pi(C('NatNMPG45'),S(L1))),numParams:1,numIndices:1,constructors:[
 {name:'FixedNMPG45.leaf',type:Pi(S(L1),Apps(C('FixedNMPG45'),[B(0),C('zeroNMPG45')]))},
 {name:'FixedNMPG45.node',type:Pi(S(L1),Pi(BI(Apps(C('FixedNMPG45'),[B(0),C('zeroNMPG45')]),B(0)),Apps(C('FixedNMPG45'),[B(1),C('oneNMPG45')]))) }
]};
{const e=env45();for(const d of [Nat,zero,one,Bi])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Fixed);const r=e.get('FixedNMPG45.rec').declaration;assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.numIndices,1);assert.deepEqual(r.metadata.mutual.indexCounts,[1,0]);}
// Lean rejects captured/promoted local outer indices for multi-parameter nested containers.
const Capt={kind:'inductive',name:'CaptNMPG45',levelParams:[],type:Pi(S(L1),Pi(C('NatNMPG45'),S(L1))),numParams:1,numIndices:1,constructors:[
 {name:'CaptNMPG45.node',type:Pi(S(L1),Pi(C('NatNMPG45'),Pi(BI(Apps(C('CaptNMPG45'),[B(1),B(0)]),B(1)),Apps(C('CaptNMPG45'),[B(2),B(1)]))))}
]};
{const e=env45();for(const d of [Nat,Bi])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Capt),/nested|local|parameter|positive|recursive/i);assert.equal(e.has('CaptNMPG45'),false);}
// explicit universe-polymorphic multi-parameter container.
const UBi={kind:'inductive',name:'UBiNMPG45',levelParams:['u'],type:Pi(TU,Pi(TU,TU)),numParams:2,numIndices:0,constructors:[
 {name:'UBiNMPG45.mk',type:Pi(TU,Pi(TU,Pi(B(1),Pi(B(1),Apps(C('UBiNMPG45',[U]),[B(3),B(2)])))))}]};
const UBI=(a,b)=>Apps(C('UBiNMPG45',[U]),[a,b]);
const Poly={kind:'inductive',name:'PolyNMPG45',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
 {name:'PolyNMPG45.leaf',type:Pi(TU,Pi(B(0),App(C('PolyNMPG45',[U]),B(1))))},
 {name:'PolyNMPG45.node',type:Pi(TU,Pi(UBI(App(C('PolyNMPG45',[U]),B(0)),B(0)),App(C('PolyNMPG45',[U]),B(1))))}
]};
{const e=env45();checkAndAddDeclaration(e,UBi);checkAndAddDeclaration(e,Poly);const r=e.get('PolyNMPG45.rec').declaration;assert.deepEqual(r.levelParams.slice(1),['u']);assert.equal(r.metadata.mutual.motiveCount,2);}
// Prop cross-product keeps Prop-only motives.
const PBi={kind:'inductive',name:'PBiNMPG45',levelParams:[],type:Pi(Prop,Pi(Prop,Prop)),numParams:2,numIndices:0,constructors:[
 {name:'PBiNMPG45.mk',type:Pi(Prop,Pi(Prop,Pi(B(1),Pi(B(1),Apps(C('PBiNMPG45'),[B(3),B(2)])))))}]};
const PBI=(a,b)=>Apps(C('PBiNMPG45'),[a,b]);
const PTree={kind:'inductive',name:'PTreeNMPG45',levelParams:[],type:Pi(Prop,Prop),numParams:1,numIndices:0,constructors:[
 {name:'PTreeNMPG45.leaf',type:Pi(Prop,Pi(B(0),App(C('PTreeNMPG45'),B(1))))},
 {name:'PTreeNMPG45.node',type:Pi(Prop,Pi(PBI(App(C('PTreeNMPG45'),B(0)),B(0)),App(C('PTreeNMPG45'),B(1))))}
]};
{const e=env45();checkAndAddDeclaration(e,PBi);checkAndAddDeclaration(e,PTree);const r=e.get('PTreeNMPG45.rec').declaration;assert.equal(r.levelParams.length,0);assert.equal(r.metadata.mutual.motiveCount,2);assert.throws(()=>infer(e,[],Apps(C('PTreeNMPG45.rec',[L1]),[])),/universe|level|argument|application/i);}
// indexed multi-parameter container: one helper family is reused across root index values.
const BiVec={kind:'inductive',name:'BiVecNMPG45',levelParams:[],type:Pi(S(L1),Pi(S(L1),Pi(C('NatNMPG45'),S(L1)))),numParams:2,numIndices:1,constructors:[
 {name:'BiVecNMPG45.nil',type:Pi(S(L1),Pi(S(L1),Apps(C('BiVecNMPG45'),[B(1),B(0),C('zeroNMPG45')])))},
 {name:'BiVecNMPG45.cons',type:Pi(S(L1),Pi(S(L1),Pi(C('NatNMPG45'),Pi(B(2),Pi(B(2),Pi(Apps(C('BiVecNMPG45'),[B(4),B(3),B(2)]),Apps(C('BiVecNMPG45'),[B(5),B(4),C('oneNMPG45')])))))))}
]};
const BV=(a,b,i)=>Apps(C('BiVecNMPG45'),[a,b,i]);
const IndexedContainerTree={kind:'inductive',name:'IndexedContainerTreeNMPG45',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'IndexedContainerTreeNMPG45.leaf',type:Pi(S(L1),Pi(B(0),App(C('IndexedContainerTreeNMPG45'),B(1))))},
 {name:'IndexedContainerTreeNMPG45.node0',type:Pi(S(L1),Pi(BV(App(C('IndexedContainerTreeNMPG45'),B(0)),B(0),C('zeroNMPG45')),App(C('IndexedContainerTreeNMPG45'),B(1))))},
 {name:'IndexedContainerTreeNMPG45.node1',type:Pi(S(L1),Pi(BV(App(C('IndexedContainerTreeNMPG45'),B(0)),B(0),C('oneNMPG45')),App(C('IndexedContainerTreeNMPG45'),B(1))))}
]};
{
 const e=env45();for(const d of [Nat,zero,one,BiVec])checkAndAddDeclaration(e,d);const c=checkAndAddDeclaration(e,IndexedContainerTree);assert.deepEqual(c.generated,['IndexedContainerTreeNMPG45.leaf','IndexedContainerTreeNMPG45.node0','IndexedContainerTreeNMPG45.node1','IndexedContainerTreeNMPG45.rec','IndexedContainerTreeNMPG45.rec_1']);
 const h=e.get('IndexedContainerTreeNMPG45.rec_1').declaration;assert.equal(h.metadata.numIndices,1);assert.deepEqual(h.metadata.mutual.indexCounts,[0,1]);assert.equal(h.metadata.rules[0].ctorParamCount,2);
}
// deep mixed multi-parameter graph.
const Deep={kind:'inductive',name:'DeepNMPG45',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
 {name:'DeepNMPG45.leaf',type:Pi(TU,Pi(B(0),App(C('DeepNMPG45',[U]),B(1))))},
 {name:'DeepNMPG45.node',type:Pi(TU,Pi(UBI(UBI(App(C('DeepNMPG45',[U]),B(0)),B(0)),App(C('DeepNMPG45',[U]),B(0))),App(C('DeepNMPG45',[U]),B(1))))}
]};
{const e=env45();checkAndAddDeclaration(e,UBi);const c=checkAndAddDeclaration(e,Deep);assert.deepEqual(c.generated.slice(-3),['DeepNMPG45.rec','DeepNMPG45.rec_1','DeepNMPG45.rec_2']);assert.deepEqual(e.get('DeepNMPG45.rec_1').declaration.metadata.rules[0].recursiveRecursors,['DeepNMPG45.rec_2','DeepNMPG45.rec']);}
// strict Core45 replay and historical v44 isolation.
{
 const declarations=[Out,Bi,Tree];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multi-parameter-generalization0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multi-parameter0'),/nested|parameter|positive|recursive/i);
 const artifact=makeKernelNestedDeeperMultiParameterGeneralizationArtifact(declarations);assert.equal(artifact.formatVersion,45);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-multi-parameter-generalization0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:44}),/unsupported v44 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-multi-parameter0'}),/unsupported v45 implementation profile/);
 const historical=makeKernelNestedDeeperMultiParameterArtifact([Out,Bi]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/nested|parameter|positive|recursive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v45-')),file=path.join(dir,'v45.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['OutNMPG45']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v45-lean-')),good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Bi (A B : Type) : Type where | mk : A → B → Bi A B\ninductive Tree (α : Type) : Type where | leaf : α → Tree α | node : Bi (Tree α) α → Tree α\n#print Tree.rec\ninductive Fixed (α : Type) : Nat → Type where | leaf : α → Fixed α 0 | node : Bi (Fixed α 0) α → Fixed α 1\n#print Fixed.rec\ninductive UBi.{u} (A B : Type u) : Type u where | mk : A → B → UBi A B\ninductive Poly.{u} (α : Type u) : Type u where | leaf : α → Poly α | node : UBi (UBi (Poly α) α) (Poly α) → Poly α\n#print Poly.rec\ninductive PBi (P Q : Prop) : Prop where | mk : P → Q → PBi P Q\ninductive PTree (P : Prop) : Prop where | leaf : P → PTree P | node : PBi (PTree P) P → PTree P\n#print PTree.rec\ninductive BiVec (A B : Type) : Nat → Type where | nil : BiVec A B 0 | cons : A → B → BiVec A B n → BiVec A B (n+1)\ninductive IT (α : Type) : Type where | leaf : α → IT α | node0 : BiVec (IT α) α 0 → IT α | node1 : BiVec (IT α) α 1 → IT α\n#print IT.rec\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);const out=gr.stdout;assert.match(out,/Bi \(Tree α\) α/);assert.match(out,/number of indices: 1/);assert.match(out,/Poly\.rec\.\{u_1, u\}/);assert.match(out,/motive_1 : PTree P → Prop/);assert.match(out,/motive_2 : \(a : Nat\) → BiVec \(IT α\) α a → Sort/);
 const bad=path.join(dir,'Captured.lean');fs.writeFileSync(bad,`inductive Bi (A B : Type) : Type where | mk : A → B → Bi A B\ninductive Capt (α : Type) : Nat → Type where | leaf : Capt α 0 | node : (n : Nat) → Bi (Capt α n) α → Capt α n\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_MULTI_PARAMETER_GENERALIZATION_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-multi-parameter-generalization0',coreFormat:45,status:'accepted',supportedSlice:'multi-parameter nested specialization graphs composed with uniform/dependent outer parameters, fixed outer indices, explicit universes, Prop, multiple fields, arbitrary depth, and indexed nested containers; constructor-local captured/promoted outer indices remain rejected exactly as Lean 4.33.1 rejects them',observations:{outerParameters:'accepted',fixedOuterIndices:'accepted',capturedMultiParameterIndices:'rejected',explicitUniverses:'accepted',nestedProp:'accepted',indexedMultiParameterContainer:'accepted',helperReuseAcrossContainerIndices:'accepted',deepMixedGraph:'accepted',linkedIota:'accepted',serializedReplay:'accepted'},historicalIsolation:{v44GeneralizedContext:'rejected'},explicitGaps:{capturedMultiParameterOuterIndices:'Lean-rejected',dependentMultiParameterContainerTelescopes:'partial',remainingGeneralRecursorEdges:'partial',resourceHardening:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v45 generalized multi-parameter nested graphs across parameters/fixed indices/universes/Prop/indexed containers, linked iota, captured-index rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean unavailable)'}`);
