import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelParam,levelOfNat,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedDeeperMultipleFieldsArtifact,makeKernelNestedDeeperPolymorphicArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const U=levelParam('u'),L1=levelOfNat(1),TU={tag:'sort',level:{tag:'succ',of:U}},S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true};
const env42=()=>new Environment({...base,allowNestedDeeperMultipleFields:true}),env41=()=>new Environment(base);
const Box={kind:'inductive',name:'BoxNDM42',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNDM42.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNDM42'),B(1))))}]};
const BX=t=>App(C('BoxNDM42'),t),BB=t=>BX(BX(t)),BBB=t=>BX(BB(t));
const Result={kind:'axiom',name:'ResultNDM42',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'r0NDM42',levelParams:[],type:C('ResultNDM42')},r1={kind:'axiom',name:'r1NDM42',levelParams:[],type:C('ResultNDM42')};

// Same specialization in two fields: one helper chain is reused, and actual iota uses both IHs.
const Same={kind:'inductive',name:'SameNDM42',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
 {name:'SameNDM42.left',type:C('SameNDM42')},{name:'SameNDM42.right',type:C('SameNDM42')},
 {name:'SameNDM42.node',type:Pi(BB(C('SameNDM42')),Pi(BB(C('SameNDM42')),C('SameNDM42')))},
]};
{
 const e=env42();for(const d of [Box,Result,r0,r1])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Same);const rec=e.get('SameNDM42.rec').declaration;
 assert.equal(rec.metadata.mutual.motiveCount,3);assert.deepEqual(rec.metadata.mutual.indexCounts,[0,0,0]);assert.deepEqual(checked.generated,['SameNDM42.left','SameNDM42.right','SameNDM42.node','SameNDM42.rec','SameNDM42.rec_1','SameNDM42.rec_2']);
 assert.deepEqual(rec.metadata.rules[2].recursiveRecursors,['SameNDM42.rec_1','SameNDM42.rec_1']);
 const tree=C('SameNDM42'),b=BX(tree),bb=BB(tree),R=C('ResultNDM42');
 const mT=Lam(tree,R),mBB=Lam(bb,R),mB=Lam(b,R),left=C('r0NDM42'),right=C('r1NDM42');
 const node=Lam(bb,Lam(bb,Lam(R,Lam(R,B(0))))); // return second field IH
 const mkOuter=Lam(b,Lam(R,B(0))),mkInner=Lam(tree,Lam(R,B(0)));
 const leftMajor=C('SameNDM42.left'),rightMajor=C('SameNDM42.right');
 const box2=x=>Apps(C('BoxNDM42.mk'),[b,Apps(C('BoxNDM42.mk'),[tree,x])]);
 const major=Apps(C('SameNDM42.node'),[box2(leftMajor),box2(rightMajor)]);
 const term=Apps(C('SameNDM42.rec',[L1]),[mT,mBB,mB,left,right,node,mkOuter,mkInner,major]);const reduced=kernelWhnf(e,term);
 assert.ok(sameTerm(reduced,C('r1NDM42')),`v42 multiple-field iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),R));
}

// Shared prefixes are deduplicated breadth/first-occurrence style: BB, BBB, then B.
const Prefix={kind:'inductive',name:'PrefixNDM42',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'PrefixNDM42.node',type:Pi(BB(C('PrefixNDM42')),Pi(BBB(C('PrefixNDM42')),C('PrefixNDM42')))}]};
{
 const e=env42();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Prefix);const rec=e.get('PrefixNDM42.rec').declaration;
 assert.equal(rec.metadata.mutual.motiveCount,4);assert.ok(e.has('PrefixNDM42.rec_3'));assert.deepEqual(rec.metadata.rules[0].recursiveRecursors,['PrefixNDM42.rec_1','PrefixNDM42.rec_2']);
 assert.deepEqual(e.get('PrefixNDM42.rec_1').declaration.metadata.rules[0].recursiveRecursors,['PrefixNDM42.rec_3']);
 assert.deepEqual(e.get('PrefixNDM42.rec_2').declaration.metadata.rules[0].recursiveRecursors,['PrefixNDM42.rec_1']);
 assert.deepEqual(e.get('PrefixNDM42.rec_3').declaration.metadata.rules[0].recursiveRecursors,['PrefixNDM42.rec']);
}

// Different container chains are independent seeds; dependencies follow in breadth order.
const Lst={kind:'inductive',name:'LstNDM42',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'LstNDM42.nil',type:Pi(S(L1),App(C('LstNDM42'),B(0)))},
 {name:'LstNDM42.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('LstNDM42'),B(1)),App(C('LstNDM42'),B(2)))))}]};
const LX=t=>App(C('LstNDM42'),t),LL=t=>LX(LX(t));
const Different={kind:'inductive',name:'DifferentNDM42',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'DifferentNDM42.node',type:Pi(BB(C('DifferentNDM42')),Pi(LL(C('DifferentNDM42')),C('DifferentNDM42')))}]};
{
 const e=env42();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Lst);checkAndAddDeclaration(e,Different);const rec=e.get('DifferentNDM42.rec').declaration;
 assert.equal(rec.metadata.mutual.motiveCount,5);assert.deepEqual(rec.metadata.rules[0].recursiveRecursors,['DifferentNDM42.rec_1','DifferentNDM42.rec_2']);
 const p1=pretty(e.get('DifferentNDM42.rec_1').declaration.type),p2=pretty(e.get('DifferentNDM42.rec_2').declaration.type),p3=pretty(e.get('DifferentNDM42.rec_3').declaration.type),p4=pretty(e.get('DifferentNDM42.rec_4').declaration.type);
 assert.match(p1,/BoxNDM42\(BoxNDM42\(DifferentNDM42\)\)/);assert.match(p2,/LstNDM42\(LstNDM42\(DifferentNDM42\)\)/);assert.match(p3,/BoxNDM42\(DifferentNDM42\)/);assert.match(p4,/LstNDM42\(DifferentNDM42\)/);
}

// Fixed indexed specializations produce distinct helpers, reusing equal repetitions.
const Nat={kind:'axiom',name:'NatNDM42',levelParams:[],type:S(L1)},z={kind:'axiom',name:'zNDM42',levelParams:[],type:C('NatNDM42')},o={kind:'axiom',name:'oNDM42',levelParams:[],type:C('NatNDM42')},two={kind:'axiom',name:'twoNDM42',levelParams:[],type:C('NatNDM42')};
const Fixed={kind:'inductive',name:'FixedNDM42',levelParams:[],type:Pi(C('NatNDM42'),S(L1)),numParams:0,numIndices:1,constructors:[
 {name:'FixedNDM42.leaf',type:App(C('FixedNDM42'),C('zNDM42'))},
 {name:'FixedNDM42.a',type:Pi(BB(App(C('FixedNDM42'),C('zNDM42'))),App(C('FixedNDM42'),C('oNDM42')))},
 {name:'FixedNDM42.b',type:Pi(BB(App(C('FixedNDM42'),C('oNDM42'))),App(C('FixedNDM42'),C('twoNDM42')))},
]};
{
 const e=env42();for(const d of [Nat,z,o,two,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Fixed);const rec=e.get('FixedNDM42.rec').declaration;
 assert.equal(rec.metadata.numParams,0);assert.equal(rec.metadata.numIndices,1);assert.equal(rec.metadata.mutual.motiveCount,5);assert.deepEqual(rec.metadata.mutual.indexCounts,[1,0,0,0,0]);
 assert.deepEqual(rec.metadata.rules[1].recursiveRecursors,['FixedNDM42.rec_1']);assert.deepEqual(rec.metadata.rules[2].recursiveRecursors,['FixedNDM42.rec_2']);
}

// Captured/promoted duplicate fields share the promoted index and helper graph.
const Capt={kind:'inductive',name:'CaptNDM42',levelParams:[],type:Pi(C('NatNDM42'),S(L1)),numParams:0,numIndices:1,constructors:[
 {name:'CaptNDM42.node',type:Pi(C('NatNDM42'),Pi(BB(App(C('CaptNDM42'),B(0))),Pi(BB(App(C('CaptNDM42'),B(1))),App(C('CaptNDM42'),B(2)))))}
]};
{
 const e=env42();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Capt);const rec=e.get('CaptNDM42.rec').declaration;
 assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.numIndices,0);assert.equal(rec.metadata.mutual.motiveCount,3);assert.deepEqual(rec.metadata.rules[0].recursiveRecursors,['CaptNDM42.rec_1','CaptNDM42.rec_1']);
}

// Explicit-universe parameterized multiple fields retain v41 universe semantics.
const PBox={kind:'inductive',name:'PBoxNDM42',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'PBoxNDM42.mk',type:Pi(TU,Pi(B(0),App(C('PBoxNDM42',[U]),B(1))))}]};
const PB=t=>App(C('PBoxNDM42',[U]),t),PBB=t=>PB(PB(t)),PBBB=t=>PB(PBB(t));
const Poly={kind:'inductive',name:'PolyNDM42',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
 {name:'PolyNDM42.node',type:Pi(TU,Pi(PBB(App(C('PolyNDM42',[U]),B(0))),Pi(PBBB(App(C('PolyNDM42',[U]),B(1))),App(C('PolyNDM42',[U]),B(2)))))}
]};
{
 const e=env42();checkAndAddDeclaration(e,PBox);checkAndAddDeclaration(e,Poly);const rec=e.get('PolyNDM42.rec').declaration;
 assert.equal(rec.metadata.mutual.motiveCount,4);assert.deepEqual(rec.levelParams.slice(1),['u']);assert.ok(e.has('PolyNDM42.rec_3'));
}

// Mixing captured and fixed outer-index regimes is an exact Lean rejection.
const Mixed={kind:'inductive',name:'MixedNDM42',levelParams:[],type:Pi(C('NatNDM42'),S(L1)),numParams:0,numIndices:1,constructors:[
 {name:'MixedNDM42.node',type:Pi(C('NatNDM42'),Pi(BB(App(C('MixedNDM42'),B(0))),Pi(BB(App(C('MixedNDM42'),C('zNDM42'))),App(C('MixedNDM42'),B(2)))))}
]};
{
 const e=env42();for(const d of [Nat,z,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Mixed),/mixed captured\/promoted and closed\/fixed|local variables|nested/i);assert.equal(e.has('MixedNDM42'),false);
}

// Historical v41 keeps the one-deep-field boundary.
{
 const e=env41();checkAndAddDeclaration(e,PBox);assert.throws(()=>checkAndAddDeclaration(e,Poly),/exactly one|one linear|nested|recursive/i);assert.equal(e.has('PolyNDM42'),false);
}

// Strict Core42 serialization/replay and profile isolation.
{
 const declarations=[PBox,Poly];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-deeper-multiple-fields0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-deeper-polymorphic0'),/exactly one|one linear|nested|recursive/i);
 const artifact=makeKernelNestedDeeperMultipleFieldsArtifact(declarations);assert.equal(artifact.formatVersion,42);assert.equal(artifact.implementationProfile,'KERNEL-nested-deeper-multiple-fields0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:41}),/unsupported v41 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-polymorphic0'}),/unsupported v42 implementation profile/);
 const historical=makeKernelNestedDeeperPolymorphicArtifact([PBox]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/exactly one|one linear|nested|recursive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v42-')),file=path.join(dir,'v42.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v42-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where | mk : α → Box α\ninductive Lst (α : Type) : Type where | nil : Lst α | cons : α → Lst α → Lst α\ninductive Same : Type where | node : Box (Box Same) → Box (Box Same) → Same\n#print Same.rec\n#check Same.rec_2\ninductive Prefix : Type where | node : Box (Box Prefix) → Box (Box (Box Prefix)) → Prefix\n#print Prefix.rec\n#check Prefix.rec_3\ninductive Different : Type where | node : Box (Box Different) → Lst (Lst Different) → Different\n#print Different.rec\n#check Different.rec_4\ninductive Fixed : Nat → Type where | leaf : Fixed 0 | a : Box (Box (Fixed 0)) → Fixed 1 | b : Box (Box (Fixed 1)) → Fixed 2\n#print Fixed.rec\nuniverse u\ninductive PBox (α : Type u) : Type u where | mk : α → PBox α\ninductive Poly (α : Type u) : Type u where | node : PBox (PBox (Poly α)) → PBox (PBox (PBox (Poly α))) → Poly α\n#print Poly.rec\n`);
 const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);const out=gr.stdout;assert.match(out,/number of motives: 3/);assert.match(out,/number of motives: 4/);assert.match(out,/number of motives: 5/);assert.match(out,/Different\.rec_4/);assert.match(out,/Poly\.rec\.\{u_1, u\}/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where | mk : α → Box α\ninductive Mixed : Nat → Type where | node (n : Nat) : Box (Box (Mixed n)) → Box (Box (Mixed 0)) → Mixed n\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/parameters cannot contain local variables|invalid nested inductive/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_DEEPER_MULTIPLE_FIELDS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-deeper-multiple-fields0',coreFormat:42,status:'accepted',supportedSlice:'multiple compatible linear nested fields over the v41 arbitrary-depth parameter/index/explicit-universe slice, with one auxiliary per unique nested specialization, shared-prefix deduplication, first-occurrence breadth ordering, and one global fixed or captured/promoted outer-index regime',observations:{identicalFieldHelperReuse:'accepted',sharedPrefixDedup:'accepted',differentContainerChains:'accepted',fixedIndexedSpecializations:'accepted',capturedPromotedDuplicates:'accepted',polymorphicParameterizedFields:'accepted',linkedIota:'accepted',mixedIndexModes:'rejected',serializedReplay:'accepted'},historicalIsolation:{v41MultipleDeepFields:'rejected'},explicitGaps:{nestedProp:'unsupported',nonlinearNestedParameters:'unsupported',mixedCapturedAndFixed:'Lean-rejected',generalNonlinearSpecializationGraph:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v42 multiple compatible nested fields, helper reuse/shared-prefix graph, indexed fixed/captured modes, polymorphism, linked iota, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean unavailable)'}`);
