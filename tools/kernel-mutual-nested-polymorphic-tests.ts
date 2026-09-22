import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelParam,levelSucc,levelMax,levelOfNat,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedPolymorphicArtifact,makeKernelMutualNestedIndicesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Pis=(domains,body)=>domains.reduceRight((out,domain)=>Pi(domain,out),body),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const U=levelParam('u'),Alev=levelParam('a'),Blev=levelParam('b'),L1=levelOfNat(1),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true};
const env52=()=>new Environment(base),env53=()=>new Environment({...base,allowMutualNestedPolymorphic:true});

const Box={kind:'inductive',name:'BoxMN53',levelParams:['u'],type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'BoxMN53.mk',type:Pi(TU,Pi(B(0),App(C('BoxMN53',[U]),B(1))))}]};
const AB={kind:'mutualInductive',name:'ABMN53',levelParams:['u'],inductives:[
  {name:'AMN53',type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
    {name:'AMN53.leaf',type:Pi(TU,App(C('AMN53',[U]),B(0)))},
    {name:'AMN53.step',type:Pi(TU,Pi(App(C('BoxMN53',[U]),App(C('BMN53',[U]),B(0))),App(C('AMN53',[U]),B(1))))},
  ]},
  {name:'BMN53',type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[
    {name:'BMN53.back',type:Pi(TU,Pi(App(C('AMN53',[U]),B(0)),App(C('BMN53',[U]),B(1))))},
  ]},
]};

// Same-universe polymorphic mutual+nested recursors and helper shape.
{
  const e=env53();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,AB);
  for(const n of ['AMN53','BMN53','AMN53.rec','BMN53.rec','AMN53.rec_1'])assert.ok(e.has(n),`missing ${n}`);
  const ar=e.get('AMN53.rec').declaration,br=e.get('BMN53.rec').declaration,hr=e.get('AMN53.rec_1').declaration;
  for(const r of [ar,br,hr]){assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams.slice(1),['u']);assert.equal(r.metadata.mutual.motiveCount,3);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);}
  assert.match(pretty(ar.type),/BoxMN53\.\{u\}\(BMN53\.\{u\}/);assert.match(pretty(hr.type),/BoxMN53\.\{u\}\(BMN53\.\{u\}/);
  assert.deepEqual(checked.generated,['AMN53.leaf','AMN53.step','BMN53.back','AMN53.rec','BMN53.rec','AMN53.rec_1']);
}

// Actual linked iota A.rec -> helper -> B.rec -> A.rec at u := 0.
{
  const e=env53();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,AB);
  const R={kind:'axiom',name:'ResultMN53',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'result0MN53',levelParams:[],type:C('ResultMN53')};checkAndAddDeclaration(e,R);checkAndAddDeclaration(e,r0);
  const carrier=C('ResultMN53'),aTy=App(C('AMN53',[LevelZero]),carrier),bTy=App(C('BMN53',[LevelZero]),carrier),boxB=App(C('BoxMN53',[LevelZero]),bTy);
  const ma=Lam(aTy,C('ResultMN53')),mb=Lam(bTy,C('ResultMN53')),mx=Lam(boxB,C('ResultMN53'));
  const leafMinor=C('result0MN53');const stepMinor=Lam(boxB,Lam(C('ResultMN53'),B(0)));const backMinor=Lam(aTy,Lam(C('ResultMN53'),B(0)));const boxMinor=Lam(bTy,Lam(C('ResultMN53'),B(0)));
  const leaf=App(C('AMN53.leaf',[LevelZero]),carrier);const back=Apps(C('BMN53.back',[LevelZero]),[carrier,leaf]);const boxed=Apps(C('BoxMN53.mk',[LevelZero]),[bTy,back]);const major=Apps(C('AMN53.step',[LevelZero]),[carrier,boxed]);
  const term=Apps(C('AMN53.rec',[L1,LevelZero]),[carrier,ma,mb,mx,leafMinor,stepMinor,backMinor,boxMinor,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0MN53')),`v53 linked polymorphic iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('ResultMN53')));
}

// Polymorphism composes with the v52 fixed-index rule.
{
  const Nat={kind:'axiom',name:'NatMN53',levelParams:[],type:S(L1)},zero={kind:'axiom',name:'zeroMN53',levelParams:[],type:C('NatMN53')};
  const Indexed={kind:'mutualInductive',name:'IndexedMN53',levelParams:['u'],inductives:[
    {name:'IAMN53',type:Pi(TU,Pi(C('NatMN53'),TU)),numParams:1,numIndices:1,constructors:[{name:'IAMN53.step',type:Pis([TU,C('NatMN53'),App(C('BoxMN53',[U]),Apps(C('IBMN53',[U]),[B(1),C('zeroMN53')]))],Apps(C('IAMN53',[U]),[B(2),B(1)]))}]},
    {name:'IBMN53',type:Pi(TU,Pi(C('NatMN53'),TU)),numParams:1,numIndices:1,constructors:[{name:'IBMN53.back',type:Pis([TU,C('NatMN53'),Apps(C('IAMN53',[U]),[B(1),B(0)])],Apps(C('IBMN53',[U]),[B(2),B(1)]))}]},
  ]};
  const e=env53();for(const d of [Nat,zero,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Indexed);const r=e.get('IAMN53.rec').declaration;assert.equal(r.kind,'recursor');assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0]);assert.deepEqual(r.levelParams.slice(1),['u']);assert.ok(e.has('IAMN53.rec_1'));
}

// Explicit two-universe container instantiation normalizing to the mutual result universe.
const LiftBox={kind:'inductive',name:'LiftBoxMN53',levelParams:['a','b'],type:Pi(S(levelSucc(Alev)),S(levelSucc(levelMax(Alev,Blev)))),numParams:1,numIndices:0,constructors:[{name:'LiftBoxMN53.mk',type:Pi(S(levelSucc(Alev)),Pi(B(0),App(C('LiftBoxMN53',[Alev,Blev]),B(1))))}]};
{
  const LiftAB={kind:'mutualInductive',name:'LiftABMN53',levelParams:['u'],inductives:[
    {name:'LAMN53',type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'LAMN53.step',type:Pi(TU,Pi(App(C('LiftBoxMN53',[U,LevelZero]),App(C('LBMN53',[U]),B(0))),App(C('LAMN53',[U]),B(1))))}]},
    {name:'LBMN53',type:Pi(TU,TU),numParams:1,numIndices:0,constructors:[{name:'LBMN53.back',type:Pi(TU,Pi(App(C('LAMN53',[U]),B(0)),App(C('LBMN53',[U]),B(1))))}]},
  ]};
  const e=env53();checkAndAddDeclaration(e,LiftBox);checkAndAddDeclaration(e,LiftAB);assert.ok(e.has('LAMN53.rec_1'));assert.match(pretty(e.get('LAMN53.rec_1').declaration.type),/LiftBoxMN53\.\{u, 0\}/);
}

// Historical v52 remains monomorphic and cannot acquire v53 semantics by relabeling.
{
  const declarations=[Box,AB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-polymorphic0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-indices0'),/positive mutual occurrence|mutual recursion|constructor field|positive|polymorphic/i);
  const artifact=makeKernelMutualNestedPolymorphicArtifact(declarations);assert.equal(artifact.formatVersion,53);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-polymorphic0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:52}),/unsupported v52 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-indices0'}),/unsupported v53 implementation profile/);
  const historical=makeKernelMutualNestedIndicesArtifact([]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|constructor field|positive|polymorphic/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-poly-v53-')),file=path.join(dir,'v53.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-poly-v53-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ninductive Box.{u} (α : Type u) : Type u where | mk : α → Box α\nmutual\n  inductive A.{u} (α : Type u) : Type u where\n    | leaf : A α\n    | step : Box (B α) → A α\n  inductive B.{u} (α : Type u) : Type u where\n    | back : A α → B α\nend\n#print A.rec\n#print A.rec_1\ninductive LiftBox.{u,v} (α : Type u) : Type (max u v) where | mk : α → LiftBox α\nmutual\n  inductive LA.{u} (α : Type u) : Type u where\n    | step : LiftBox.{u,0} (LB α) → LA α\n  inductive LB.{u} (α : Type u) : Type u where\n    | back : LA α → LB α\nend\n#check LA.rec_1\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/A\.rec\.\{u_1, u\}/);assert.match(gr.stdout,/A\.rec_1\.\{u_1, u\}/);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/LiftBox\.\{u, 0\}/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box.{u} (α : Type u) : Type u where | mk : α → Box α\nmutual\n  inductive A.{u} (α : Type u) : Type u where\n    | step : Box.{u+1} (B α) → A α\n  inductive B.{u} (α : Type u) : Type u where\n    | back : A α → B α\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Application type mismatch|universe|expected/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_POLYMORPHIC_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-polymorphic0',coreFormat:53,status:'accepted',supportedSlice:'Type-valued universe-polymorphic mutual families with shared parameters/per-member indices and one-level non-indexed nested containers; explicit container universe instantiations preserved and specialized helper result universe must equal the mutual block result universe',observations:{sameUniversePolymorphic:'accepted',linkedIota:'accepted',polymorphicWithOuterIndices:'accepted',explicitMultiUniverseContainer:'accepted',helperLevelOrder:'accepted',universeMismatch:'rejected',serializedReplay:'accepted'},historicalIsolation:{v52PolymorphicMutualNested:'rejected'},explicitGaps:{mutualNestedProp:'unsupported',deeperMutualNestedGraph:'unsupported',indexedNestedContainers:'unsupported',containerUniverseMetavariableInference:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v53 universe-polymorphic mutual+nested preprocessing, explicit container instantiation, linked iota, outer-index composition, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
