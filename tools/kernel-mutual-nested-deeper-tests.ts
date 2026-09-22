import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperArtifact,makeKernelMutualNestedIndexedContainersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L0=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true};
const env55=()=>new Environment(base),env56=()=>new Environment({...base,allowMutualNestedDeeper:true});

const Box={kind:'inductive',name:'BoxMN56',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxMN56.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN56'),B(1))))}]};
const AB={kind:'mutualInductive',name:'ABMN56',levelParams:[],inductives:[
 {name:'AMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'AMN56.leaf',type:C('AMN56')},{name:'AMN56.step',type:Pi(App(C('BoxMN56'),App(C('BoxMN56'),C('BMN56'))),C('AMN56'))}]},
 {name:'BMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BMN56.back',type:Pi(C('AMN56'),C('BMN56'))}]},
]};

// Exact helper order/motive graph for Box(Box B).
{
 const e=env56();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,AB);
 for(const n of ['AMN56.rec','BMN56.rec','AMN56.rec_1','AMN56.rec_2'])assert.ok(e.has(n),`missing ${n}`);
 assert.equal(e.has('AMN56.rec_3'),false);
 const r=e.get('AMN56.rec').declaration,h1=e.get('AMN56.rec_1').declaration,h2=e.get('AMN56.rec_2').declaration;
 for(const x of [r,h1,h2])assert.equal(x.kind,'recursor');
 assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.recursors,['AMN56.rec','BMN56.rec','AMN56.rec_1','AMN56.rec_2']);
 assert.match(pretty(h1.type),/BoxMN56\(BoxMN56\(BMN56\)\)/);assert.match(pretty(h2.type),/BoxMN56\(BMN56\)/);
 assert.deepEqual(h1.metadata.rules.map(x=>x.ctor),['BoxMN56.mk']);assert.deepEqual(h2.metadata.rules.map(x=>x.ctor),['BoxMN56.mk']);
 assert.deepEqual(checked.generated,['AMN56.leaf','AMN56.step','BMN56.back','AMN56.rec','BMN56.rec','AMN56.rec_1','AMN56.rec_2']);
}

// Actual four-motive linked reduction: A.step -> helper1 -> helper2 -> B.rec -> A.rec -> leaf.
{
 const e=env56();for(const d of [Box,AB])checkAndAddDeclaration(e,d);
 const R={kind:'axiom',name:'RMN56',levelParams:[],type:S(L1)},r0={kind:'axiom',name:'r0MN56',levelParams:[],type:C('RMN56')};for(const d of [R,r0])checkAndAddDeclaration(e,d);
 const A=C('AMN56'),Bv=C('BMN56'),boxB=App(C('BoxMN56'),Bv),boxboxB=App(C('BoxMN56'),boxB),out=C('RMN56');
 const mA=Lam(A,out),mB=Lam(Bv,out),mOuter=Lam(boxboxB,out),mInner=Lam(boxB,out);
 const leaf=C('r0MN56');
 const step=Lam(boxboxB,Lam(out,B(0))),back=Lam(A,Lam(out,B(0))),mkOuter=Lam(boxB,Lam(out,B(0))),mkInner=Lam(Bv,Lam(out,B(0)));
 const major=App(C('AMN56.step'),Apps(C('BoxMN56.mk'),[boxB,Apps(C('BoxMN56.mk'),[Bv,App(C('BMN56.back'),C('AMN56.leaf'))])]));
 const term=Apps(C('AMN56.rec',[L1]),[mA,mB,mOuter,mInner,leaf,step,back,mkOuter,mkInner,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('r0MN56')),`v56 linked deep iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Arbitrary finite depth in the bounded linear path: depth three gives three helpers / five motives.
const Deep3={kind:'mutualInductive',name:'Deep3MN56',levelParams:[],inductives:[
 {name:'D3AMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'D3AMN56.step',type:Pi(App(C('BoxMN56'),App(C('BoxMN56'),App(C('BoxMN56'),C('D3BMN56')))),C('D3AMN56'))}]},
 {name:'D3BMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'D3BMN56.back',type:Pi(C('D3AMN56'),C('D3BMN56'))}]},
]};
{
 const e=env56();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,Deep3);const r=e.get('D3AMN56.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.mutual.motiveCount,5);for(const n of ['D3AMN56.rec_1','D3AMN56.rec_2','D3AMN56.rec_3'])assert.ok(e.has(n));assert.equal(e.has('D3AMN56.rec_4'),false);
}

// Prop-valued deep graph uses the same helper graph with no fresh motive universe.
const Wrap={kind:'inductive',name:'WrapMN56',levelParams:[],type:Pi(S(L0),S(L0)),numParams:1,numIndices:0,constructors:[{name:'WrapMN56.mk',type:Pi(S(L0),Pi(B(0),App(C('WrapMN56'),B(1))))}]};
const PAB={kind:'mutualInductive',name:'PABMN56',levelParams:[],inductives:[
 {name:'PAMN56',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PAMN56.leaf',type:C('PAMN56')},{name:'PAMN56.step',type:Pi(App(C('WrapMN56'),App(C('WrapMN56'),C('PBMN56'))),C('PAMN56'))}]},
 {name:'PBMN56',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'PBMN56.back',type:Pi(C('PAMN56'),C('PBMN56'))}]},
]};
{
 const e=env56();checkAndAddDeclaration(e,Wrap);checkAndAddDeclaration(e,PAB);const r=e.get('PAMN56.rec').declaration,h1=e.get('PAMN56.rec_1').declaration,h2=e.get('PAMN56.rec_2').declaration;for(const x of [r,h1,h2]){assert.equal(x.kind,'recursor');assert.deepEqual(x.levelParams,[]);}assert.equal(r.metadata.mutual.motiveCount,4);
 const Q={kind:'axiom',name:'QMN56',levelParams:[],type:S(L0)},q={kind:'axiom',name:'qMN56',levelParams:[],type:C('QMN56')};for(const d of [Q,q])checkAndAddDeclaration(e,d);
 const A=C('PAMN56'),Bv=C('PBMN56'),wB=App(C('WrapMN56'),Bv),wwB=App(C('WrapMN56'),wB),out=C('QMN56');
 const term=Apps(C('PAMN56.rec'),[Lam(A,out),Lam(Bv,out),Lam(wwB,out),Lam(wB,out),C('qMN56'),Lam(wwB,Lam(out,B(0))),Lam(A,Lam(out,B(0))),Lam(wB,Lam(out,B(0))),Lam(Bv,Lam(out,B(0))),App(C('PAMN56.step'),Apps(C('WrapMN56.mk'),[wB,Apps(C('WrapMN56.mk'),[Bv,App(C('PBMN56.back'),C('PAMN56.leaf'))])]))]);
 assert.ok(sameTerm(kernelWhnf(e,term),C('qMN56')));
}

// The bounded slice rejects multiple deep fields and negative-variance deep paths atomically.
{
 const Multi={kind:'mutualInductive',name:'MultiDeepMN56',levelParams:[],inductives:[
  {name:'MDAMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'MDAMN56.mk',type:Pi(App(C('BoxMN56'),App(C('BoxMN56'),C('MDBMN56'))),Pi(App(C('BoxMN56'),App(C('BoxMN56'),C('MDAMN56'))),C('MDAMN56')))}]},
  {name:'MDBMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'MDBMN56.back',type:Pi(C('MDAMN56'),C('MDBMN56'))}]},
 ]};
 const e=env56();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Multi),/exactly one closed linear nested recursive field/);assert.equal(e.has('MDAMN56'),false);
}
{
 const N={kind:'axiom',name:'NatMN56',levelParams:[],type:S(L1)};
 const Contra={kind:'inductive',name:'ContraMN56',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'ContraMN56.mk',type:Pi(S(L1),Pi(Pi(B(0),C('NatMN56')),App(C('ContraMN56'),B(1))))}]};
 const Bad={kind:'mutualInductive',name:'BadDeepMN56',levelParams:[],inductives:[
  {name:'BadAMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadAMN56.mk',type:Pi(App(C('BoxMN56'),App(C('ContraMN56'),C('BadBMN56'))),C('BadAMN56'))}]},
  {name:'BadBMN56',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BadBMN56.back',type:Pi(C('BadAMN56'),C('BadBMN56'))}]},
 ]};
 const e=env56();for(const d of [N,Box,Contra])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/non-positive|positive mutual occurrence|positivity/i);assert.equal(e.has('BadAMN56'),false);
}

// Strict serialization/replay and historical v55 semantic isolation.
{
 const declarations=[Box,AB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-indexed-containers0'),/positive mutual occurrence|mutual recursion|constructor field|nested|positive/i);
 const artifact=makeKernelMutualNestedDeeperArtifact(declarations);assert.equal(artifact.formatVersion,56);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:55}),/unsupported v55 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-indexed-containers0'}),/unsupported v56 implementation profile/);
 const historical=makeKernelMutualNestedIndexedContainersArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|constructor field|nested|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-v56-')),file=path.join(dir,'v56.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-v56-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A : Type where | leaf : A | step : Box (Box B) → A\n  inductive B : Type where | back : A → B\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\nmutual\n  inductive D3A : Type where | step : Box (Box (Box D3B)) → D3A\n  inductive D3B : Type where | back : D3A → D3B\nend\n#print D3A.rec\n#check D3A.rec_1\n#check D3A.rec_2\n#check D3A.rec_3\ninductive Wrap (P : Prop) : Prop where | mk : P → Wrap P\nmutual\n  inductive PA : Prop where | leaf : PA | step : Wrap (Wrap PB) → PA\n  inductive PB : Prop where | back : PA → PB\nend\n#print PA.rec\n#print PA.rec_1\n#print PA.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/motive_3 : Box \(Box B\) → Sort/);assert.match(gr.stdout,/motive_4 : Box B → Sort/);assert.match(gr.stdout,/A\.rec_2/);assert.match(gr.stdout,/number of motives: 5/);assert.match(gr.stdout,/D3A\.rec_3/);assert.match(gr.stdout,/motive_3 : Wrap \(Wrap PB\) → Prop/);assert.match(gr.stdout,/motive_4 : Wrap PB → Prop/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper0',coreFormat:56,status:'accepted',supportedSlice:'parameterless/indexless monomorphic Type or Prop mutual blocks with exactly one closed linear nested recursive path of arbitrary finite depth >=2 through monomorphic one-parameter zero-index containers',observations:{depth2Type:'accepted',fourMotiveOrder:'accepted',linkedDeepIota:'accepted',depth3Type:'accepted',fiveMotiveOrder:'accepted',depth2Prop:'accepted',propOnlyMotiveFamily:'accepted',negativeVariance:'rejected',serializedReplay:'accepted'},historicalIsolation:{v55DeepMutualNested:'rejected'},explicitGaps:{sharedParametersOrOuterIndices:'unsupported',polymorphicDeepMutualNested:'unsupported',multipleDeepFields:'unsupported',indexedDeepContainers:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v56 bounded arbitrary-depth mutual+nested helper chains, exact helper order, linked iota, Prop composition, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
