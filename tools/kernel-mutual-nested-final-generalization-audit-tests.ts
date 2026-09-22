import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedFinalGeneralizationAuditArtifact,makeKernelMutualNestedDeeperMultipleRecursiveParameterSlotsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true,allowMutualNestedDeeperDependentContainerParameters:true,allowMutualNestedDeeperMultipleFields:true,allowMutualNestedDeeperMultipleRecursiveParameterSlots:true};
const env65=()=>new Environment(base),env66=()=>new Environment({...base,allowMutualNestedFinalGeneralizationAudit:true});

const Ix={kind:'inductive',name:'IxMN66',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN66.z',type:C('IxMN66')},{name:'IxMN66.s',type:C('IxMN66')}]};
const PairT={kind:'inductive',name:'PairTMN66',levelParams:['u'],type:Pi(TU,Pi(TU,TU)),numParams:2,numIndices:0,constructors:[{name:'PairTMN66.mk',type:Pi(TU,Pi(TU,Pi(B(1),Pi(B(1),Apps(C('PairTMN66',[U]),[B(3),B(2)])))))}]};
const PairP={kind:'inductive',name:'PairPMN66',levelParams:[],type:Pi(Prop,Pi(Prop,Prop)),numParams:2,numIndices:0,constructors:[{name:'PairPMN66.mk',type:Pi(Prop,Pi(Prop,Pi(B(1),Pi(B(1),Apps(C('PairPMN66'),[B(3),B(2)])))))}]};
const PairT0={kind:'inductive',name:'PairT0MN66',levelParams:[],type:Pi(S(L1),Pi(S(L1),S(L1))),numParams:2,numIndices:0,constructors:[{name:'PairT0MN66.mk',type:Pi(S(L1),Pi(S(L1),Pi(B(1),Pi(B(1),Apps(C('PairT0MN66'),[B(3),B(2)])))))}]};
const Ix0={kind:'inductive',name:'Ix0MN66',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'Ix0MN66.z',type:C('Ix0MN66')},{name:'Ix0MN66.s',type:C('Ix0MN66')}]};
const ix0=C('Ix0MN66'),z0=C('Ix0MN66.z');
const monoTarget=(name,index=z0)=>App(C(name),index);
const monoInner=name=>Apps(C('PairT0MN66'),[monoTarget(name),monoTarget(name)]);
const monoOuter=name=>Apps(C('PairT0MN66'),[monoInner(name),monoInner(name)]);
const Type0IndexedGraph={kind:'mutualInductive',name:'Type0IndexedGraphMN66',levelParams:[],inductives:[
 {name:'AI0MN66',type:Pi(ix0,S(L1)),numParams:0,numIndices:1,constructors:[{name:'AI0MN66.leaf',type:App(C('AI0MN66'),z0)},{name:'AI0MN66.step',type:Pi(ix0,Pi(monoOuter('BI0MN66'),App(C('AI0MN66'),B(1))))}]},
 {name:'BI0MN66',type:Pi(ix0,S(L1)),numParams:0,numIndices:1,constructors:[{name:'BI0MN66.back',type:Pi(ix0,Pi(App(C('AI0MN66'),B(0)),App(C('BI0MN66'),B(1))))}]},
]};
const niTarget=C('BNI0MN66');
const niInner=()=>Apps(C('PairT0MN66'),[niTarget,niTarget]);
const niOuter=()=>Apps(C('PairT0MN66'),[niInner(),niInner()]);
const Type0NonIndexedGraph={kind:'mutualInductive',name:'Type0NonIndexedGraphMN66',levelParams:[],inductives:[
 {name:'ANI0MN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'ANI0MN66.leaf',type:C('ANI0MN66')},{name:'ANI0MN66.step',type:Pi(niOuter(),C('ANI0MN66'))}]},
 {name:'BNI0MN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BNI0MN66.back',type:Pi(C('ANI0MN66'),C('BNI0MN66'))}]},
]};
const ix=C('IxMN66'),z=C('IxMN66.z'),s=C('IxMN66.s');
const tTarget=(alpha,index=z,name='BTMN66')=>Apps(C(name,[U]),[alpha,index]);
const tInner=(alpha,index=z,name='BTMN66')=>Apps(C('PairTMN66',[U]),[tTarget(alpha,index,name),tTarget(alpha,index,name)]);
const tOuter=(alpha,index=z,name='BTMN66')=>Apps(C('PairTMN66',[U]),[tInner(alpha,index,name),tInner(alpha,index,name)]);
const pTarget=(alpha,index=z,name='BPMN66')=>Apps(C(name,[U]),[alpha,index]);
const pInner=(alpha,index=z,name='BPMN66')=>Apps(C('PairPMN66'),[pTarget(alpha,index,name),pTarget(alpha,index,name)]);
const pOuter=(alpha,index=z,name='BPMN66')=>Apps(C('PairPMN66'),[pInner(alpha,index,name),pInner(alpha,index,name)]);

const NatHO={kind:'axiom',name:'NatHOMN66',levelParams:[],type:S(L1)};
const BoxHO={kind:'inductive',name:'BoxHOMN66',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxHOMN66.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxHOMN66'),B(1))))}]};
const HigherOuterGraph={kind:'mutualInductive',name:'HigherOuterGraphMN66',levelParams:[],inductives:[
 {name:'AHOMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'AHOMN66.leaf',type:C('AHOMN66')},{name:'AHOMN66.step',type:Pi(Pi(C('NatHOMN66'),App(C('BoxHOMN66'),C('BHOMN66'))),C('AHOMN66'))}]},
 {name:'BHOMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BHOMN66.back',type:Pi(C('AHOMN66'),C('BHOMN66'))}]},
]};
const HigherParamGraph={kind:'mutualInductive',name:'HigherParamGraphMN66',levelParams:[],inductives:[
 {name:'APFMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'APFMN66.leaf',type:C('APFMN66')},{name:'APFMN66.step',type:Pi(App(C('BoxHOMN66'),Pi(C('NatHOMN66'),C('BPFMN66'))),C('APFMN66'))}]},
 {name:'BPFMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BPFMN66.back',type:Pi(C('APFMN66'),C('BPFMN66'))}]},
]};
const MutualContainers={kind:'mutualInductive',name:'MutualContainersMN66',levelParams:[],inductives:[
 {name:'MBoxMN66',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'MBoxMN66.mk',type:Pi(S(L1),Pi(B(0),Pi(App(C('MWrapMN66'),B(1)),App(C('MBoxMN66'),B(2)))))}]},
 {name:'MWrapMN66',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'MWrapMN66.mk',type:Pi(S(L1),Pi(B(0),Pi(App(C('MBoxMN66'),B(1)),App(C('MWrapMN66'),B(2)))))}]},
]};
const MutualContainerUse={kind:'mutualInductive',name:'MutualContainerUseMN66',levelParams:[],inductives:[
 {name:'AMCMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'AMCMN66.leaf',type:C('AMCMN66')},{name:'AMCMN66.step',type:Pi(App(C('MBoxMN66'),C('BMCMN66')),C('AMCMN66'))}]},
 {name:'BMCMN66',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BMCMN66.back',type:Pi(C('AMCMN66'),C('BMCMN66'))}]},
]};
const TypeGraph={kind:'mutualInductive',name:'TypeGraphMN66',levelParams:['u'],inductives:[
 {name:'ATMN66',type:Pi(TU,Pi(ix,TU)),numParams:1,numIndices:1,constructors:[
  {name:'ATMN66.leaf',type:Pi(TU,Apps(C('ATMN66',[U]),[B(0),z]))},
  {name:'ATMN66.step',type:Pi(TU,Pi(ix,Pi(tOuter(B(1)),Apps(C('ATMN66',[U]),[B(2),B(1)]))))}]},
 {name:'BTMN66',type:Pi(TU,Pi(ix,TU)),numParams:1,numIndices:1,constructors:[{name:'BTMN66.back',type:Pi(TU,Pi(ix,Pi(Apps(C('ATMN66',[U]),[B(1),B(0)]),Apps(C('BTMN66',[U]),[B(2),B(1)]))))}]},
]};
const PropGraph={kind:'mutualInductive',name:'PropGraphMN66',levelParams:['u'],inductives:[
 {name:'APMN66',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'APMN66.leaf',type:Pi(TU,Apps(C('APMN66',[U]),[B(0),z]))},
  {name:'APMN66.step',type:Pi(TU,Pi(ix,Pi(pOuter(B(1)),Apps(C('APMN66',[U]),[B(2),B(1)]))))}]},
 {name:'BPMN66',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BPMN66.back',type:Pi(TU,Pi(ix,Pi(Apps(C('APMN66',[U]),[B(1),B(0)]),Apps(C('BPMN66',[U]),[B(2),B(1)]))))}]},
]};

// v65 is deliberately Prop-only for the nonlinear graph; v66 admits the exact
// same helper topology in a provably nonzero Type universe.
{
 const old=env65();for(const d of [Ix,PairT])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,TypeGraph),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const e=env66();for(const d of [Ix,PairT])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,TypeGraph);
 for(const n of ['ATMN66.rec','BTMN66.rec','ATMN66.rec_1','ATMN66.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('ATMN66.rec_3'),false);
 const r=e.get('ATMN66.rec').declaration,h1=e.get('ATMN66.rec_1').declaration,h2=e.get('ATMN66.rec_2').declaration;
 for(const rec of [r,h1,h2]){assert.equal(rec.kind,'recursor');assert.equal(rec.metadata.mutual.motiveCount,4);assert.deepEqual(rec.metadata.mutual.indexCounts,[1,1,0,0]);assert.equal(rec.levelParams.length,2);assert.equal(rec.levelParams[1],'u');}
 const outerRule=h1.metadata.rules[0],innerRule=h2.metadata.rules[0];assert.deepEqual(outerRule.recursiveFields,[true,true]);assert.deepEqual(innerRule.recursiveFields,[true,true]);assert.deepEqual(outerRule.recursiveRecursors,['ATMN66.rec_2','ATMN66.rec_2']);assert.deepEqual(innerRule.recursiveRecursors,['BTMN66.rec','BTMN66.rec']);
 assert.deepEqual(checked.generated,['ATMN66.leaf','ATMN66.step','BTMN66.back','ATMN66.rec','BTMN66.rec','ATMN66.rec_1','ATMN66.rec_2']);
}

// v66 must preserve the v65 Prop graph too.
{
 const e=env66();for(const d of [Ix,PairP])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,PropGraph);assert.equal(e.get('APMN66.rec').declaration.metadata.mutual.motiveCount,4);assert.deepEqual(e.get('APMN66.rec_1').declaration.metadata.rules[0].recursiveFields,[true,true]);
}

// v66 removes legacy v65 routing-only requirements for universe parameters
// and outer indices. Exact Lean gives the same four-motive nonlinear graph at
// monomorphic Type 0, both with and without outer indices.
{
 const e=env66();for(const d of [PairT0,Ix0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Type0IndexedGraph);assert.equal(e.get('AI0MN66.rec').declaration.metadata.mutual.motiveCount,4);assert.ok(e.has('AI0MN66.rec_1'));assert.ok(e.has('AI0MN66.rec_2'));
 const old=env65();for(const d of [PairT0,Ix0])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Type0IndexedGraph),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
}
{
 const e=env66();checkAndAddDeclaration(e,PairT0);checkAndAddDeclaration(e,Type0NonIndexedGraph);assert.equal(e.get('ANI0MN66.rec').declaration.metadata.mutual.motiveCount,4);assert.ok(e.has('ANI0MN66.rec_1'));assert.ok(e.has('ANI0MN66.rec_2'));
 const old=env65();checkAndAddDeclaration(old,PairT0);assert.throws(()=>checkAndAddDeclaration(old,Type0NonIndexedGraph),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
}

// v66 composes nested-helper preprocessing with the already-trusted
// higher-order positive mutual recursion rule. Both a container under a Pi
// codomain and a Pi-valued recursive container parameter receive pointwise IHs.
{
 assert.equal(checkCoreDeclarations([NatHO,BoxHO,HigherOuterGraph],'KERNEL-mutual-nested-final-generalization-audit0').status,'accepted');
 assert.equal(checkCoreDeclarations([NatHO,BoxHO,HigherParamGraph],'KERNEL-mutual-nested-final-generalization-audit0').status,'accepted');
 assert.throws(()=>checkCoreDeclarations([NatHO,BoxHO,HigherOuterGraph],'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0'),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const e=env66();for(const d of [NatHO,BoxHO])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,HigherOuterGraph);const step=e.get('AHOMN66.rec').declaration.metadata.rules.find(r=>r.ctor==='AHOMN66.step');assert.ok(step);assert.deepEqual(step.recursiveFields,[true]);assert.deepEqual(step.recursiveRecursors,['AHOMN66.rec_1']);
 const ep=env66();for(const d of [NatHO,BoxHO])checkAndAddDeclaration(ep,d);checkAndAddDeclaration(ep,HigherParamGraph);const helper=ep.get('APFMN66.rec_1').declaration.metadata.rules[0];assert.deepEqual(helper.recursiveFields,[true]);assert.deepEqual(helper.recursiveRecursors,['BPFMN66.rec']);
}

// v66 closes transitively over constructor dependencies of a pre-existing
// mutually recursive container family. Lean exposes both MBox B and MWrap B as
// helper motives; ProofScript must discover/recheck the same specialized cycle.
{
 assert.equal(checkCoreDeclarations([MutualContainers,MutualContainerUse],'KERNEL-mutual-nested-final-generalization-audit0').status,'accepted');
 assert.throws(()=>checkCoreDeclarations([MutualContainers,MutualContainerUse],'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0'),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const e=env66();checkAndAddDeclaration(e,MutualContainers);checkAndAddDeclaration(e,MutualContainerUse);assert.equal(e.get('AMCMN66.rec').declaration.metadata.mutual.motiveCount,4);assert.ok(e.has('AMCMN66.rec_1'));assert.ok(e.has('AMCMN66.rec_2'));
 const h1=e.get('AMCMN66.rec_1').declaration.metadata.rules[0],h2=e.get('AMCMN66.rec_2').declaration.metadata.rules[0];assert.deepEqual(h1.recursiveFields,[true,true]);assert.deepEqual(h2.recursiveFields,[true,true]);assert.deepEqual(h1.recursiveRecursors,['BMCMN66.rec','AMCMN66.rec_2']);assert.deepEqual(h2.recursiveRecursors,['BMCMN66.rec','AMCMN66.rec_1']);
}

// Actual Type-valued linked iota crosses both nonlinear helper layers.
{
 const Out={kind:'axiom',name:'OutMN66',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MN66',levelParams:[],type:C('OutMN66')};
 const e=env66();for(const d of [Ix,PairT,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TypeGraph);
 const alpha=ix,b0=Apps(C('BTMN66',[Z]),[alpha,z]),innerTy=Apps(C('PairTMN66',[Z]),[b0,b0]),outerTy=Apps(C('PairTMN66',[Z]),[innerTy,innerTy]),out=C('OutMN66');
 const args=[alpha,
  Lam(ix,Lam(Apps(C('ATMN66',[Z]),[alpha,B(0)]),out)),Lam(ix,Lam(Apps(C('BTMN66',[Z]),[alpha,B(0)]),out)),
  Lam(outerTy,out),Lam(innerTy,out),
  C('out0MN66'),
  Lam(ix,Lam(outerTy,Lam(out,B(0)))),
  Lam(ix,Lam(Apps(C('ATMN66',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  Lam(innerTy,Lam(innerTy,Lam(out,Lam(out,B(1))))),
  Lam(b0,Lam(b0,Lam(out,Lam(out,B(1))))),
 ];
 const leaf=App(C('ATMN66.leaf',[Z]),alpha),b1=Apps(C('BTMN66.back',[Z]),[alpha,z,leaf]),b2=Apps(C('BTMN66.back',[Z]),[alpha,z,leaf]);
 const i1=Apps(C('PairTMN66.mk',[Z]),[b0,b0,b1,b2]),i2=Apps(C('PairTMN66.mk',[Z]),[b0,b0,b2,b1]),outerVal=Apps(C('PairTMN66.mk',[Z]),[innerTy,innerTy,i1,i2]);
 const major=Apps(C('ATMN66.step',[Z]),[alpha,s,outerVal]),term=Apps(C('ATMN66.rec',[L1,Z]),[...args,s,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0MN66')),`v66 Type linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Bare Sort u is Lean-invalid because u may instantiate to Prop or Type. v65
// historically accepted it; v66 rejects it without changing old semantics.
{
 const Potential={kind:'mutualInductive',name:'PotentialMN66',levelParams:['u'],inductives:[
  {name:'PotentialAMN66',type:S(U),numParams:0,numIndices:0,constructors:[{name:'PotentialAMN66.mk',type:C('PotentialAMN66',[U])}]},
  {name:'PotentialBMN66',type:S(U),numParams:0,numIndices:0,constructors:[{name:'PotentialBMN66.mk',type:C('PotentialBMN66',[U])}]},
 ]};
 assert.equal(checkCoreDeclarations([Potential],'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0').status,'accepted');
 assert.throws(()=>checkCoreDeclarations([Potential],'KERNEL-mutual-nested-final-generalization-audit0'),/invalid universe polymorphic mutual result Sort/);
}

// Constructor-local target indices buried under Type containers remain rejected.
{
 const Bad={kind:'mutualInductive',name:'BadTypeLocalMN66',levelParams:['u'],inductives:[
  {name:'ALT66',type:Pi(TU,Pi(ix,TU)),numParams:1,numIndices:1,constructors:[{name:'ALT66.step',type:Pi(TU,Pi(ix,Pi(Apps(C('PairTMN66',[U]),[tInner(B(1),B(0),'BLT66'),tInner(B(1),B(0),'BLT66')]),Apps(C('ALT66',[U]),[B(2),B(1)]))))}]},
  {name:'BLT66',type:Pi(TU,Pi(ix,TU)),numParams:1,numIndices:1,constructors:[{name:'BLT66.base',type:Pi(TU,Pi(ix,Apps(C('BLT66',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env66();for(const d of [Ix,PairT])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/capture constructor\/index-local|specialization|v66/i);
}

// Strict Core v66 replay and v65 isolation/relabel resistance.
{
 const declarations=[Ix,PairT,TypeGraph];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-final-generalization-audit0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0'),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const artifact=makeKernelMutualNestedFinalGeneralizationAuditArtifact(declarations);assert.equal(artifact.formatVersion,66);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-final-generalization-audit0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:65}),/unsupported v65 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0'}),/unsupported v66 implementation profile/);
 const historical=makeKernelMutualNestedDeeperMultipleRecursiveParameterSlotsArtifact([Ix,PairT]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|nested|Prop|constructor field|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v66-replay-')),file=path.join(dir,'v66.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v66-lean-'));
 const good=path.join(dir,'TypeGraph.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive PairT.{u} (P Q : Type u) : Type u where | mk (p : P) (q : Q) : PairT P Q\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Type u where | leaf : A α 0 | step (n : Nat) (x : PairT (PairT (B α 0) (B α 0)) (PairT (B α 0) (B α 0))) : A α n\n inductive B (α : Type u) : Nat → Type u where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/A\.rec\.\{u_1, u\}/);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/A\.rec_2/);assert.doesNotMatch(gr.stdout,/A\.rec_3/);
 const mono=path.join(dir,'Type0Graphs.lean');fs.writeFileSync(mono,`set_option inductive.autoPromoteIndices false
inductive Pair0 (P Q : Type) : Type where | mk (p : P) (q : Q) : Pair0 P Q
inductive Ix0 : Type where | z | s
mutual
 inductive A0 : Ix0 → Type where | leaf : A0 .z | step (i : Ix0) (x : Pair0 (Pair0 (B0 .z) (B0 .z)) (Pair0 (B0 .z) (B0 .z))) : A0 i
 inductive B0 : Ix0 → Type where | back (i : Ix0) : A0 i → B0 i
end
#print A0.rec
#print A0.rec_1
#print A0.rec_2
mutual
 inductive AN : Type where | leaf : AN | step (x : Pair0 (Pair0 BN BN) (Pair0 BN BN)) : AN
 inductive BN : Type where | back : AN → BN
end
#print AN.rec
#print AN.rec_1
#print AN.rec_2
`);const mr=spawnSync(lean,[mono],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(mr.status,0,mr.stderr||mr.stdout);assert.equal((mr.stdout.match(/number of motives: 4/g)||[]).length,6);assert.match(mr.stdout,/A0\.rec_2/);assert.match(mr.stdout,/AN\.rec_2/);
 const higher=path.join(dir,'HigherOrder.lean');fs.writeFileSync(higher,`set_option inductive.autoPromoteIndices false
inductive BoxHO (P : Type) : Type where | mk : P → BoxHO P
mutual
 inductive AHO : Type where | leaf : AHO | step : (Nat → BoxHO BHO) → AHO
 inductive BHO : Type where | back : AHO → BHO
end
#print AHO.rec
#print AHO.rec_1
mutual
 inductive APF : Type where | leaf : APF | step : BoxHO (Nat → BPF) → APF
 inductive BPF : Type where | back : APF → BPF
end
#print APF.rec
#print APF.rec_1
`);const hr=spawnSync(lean,[higher],{encoding:'utf8'});assert.equal(hr.status,0,hr.stderr||hr.stdout);assert.match(hr.stdout,/number of motives: 3/);assert.match(hr.stdout,/AHO\.rec_1/);assert.match(hr.stdout,/APF\.rec_1/);
 const higherLocal=path.join(dir,'HigherLocalBad.lean');fs.writeFileSync(higherLocal,`set_option inductive.autoPromoteIndices false
inductive BoxHOI (P : Type) : Type where | mk : P → BoxHOI P
mutual
 inductive AHOI : Type where | leaf : AHOI | step : ((n : Nat) → BoxHOI (BHOI n)) → AHOI
 inductive BHOI : Nat → Type where | back (n : Nat) : AHOI → BHOI n
end
`);const hir=spawnSync(lean,[higherLocal],{encoding:'utf8'});assert.notEqual(hir.status,0);assert.match(hir.stderr+hir.stdout,/nested inductive datatypes parameters cannot contain local variables/);
 const mixed=path.join(dir,'MixedUniverse.lean');fs.writeFileSync(mixed,`set_option inductive.autoPromoteIndices false
mutual
 inductive AMix : Type where | mk : BMix → AMix
 inductive BMix : Type 1 where | mk : AMix → BMix
end
`);const mixr=spawnSync(lean,[mixed],{encoding:'utf8'});assert.notEqual(mixr.status,0);assert.match(mixr.stderr+mixr.stdout,/must belong to the same type universe/);
 const mutualContainer=path.join(dir,'MutualContainer.lean');fs.writeFileSync(mutualContainer,`set_option inductive.autoPromoteIndices false
mutual
 inductive MBox (P : Type) : Type where | mk : P → MWrap P → MBox P
 inductive MWrap (P : Type) : Type where | mk : P → MBox P → MWrap P
end
mutual
 inductive AUse : Type where | leaf : AUse | step : MBox BUse → AUse
 inductive BUse : Type where | back : AUse → BUse
end
#print AUse.rec
#print AUse.rec_1
#print AUse.rec_2
`);const mcr=spawnSync(lean,[mutualContainer],{encoding:'utf8'});assert.equal(mcr.status,0,mcr.stderr||mcr.stdout);assert.match(mcr.stdout,/number of motives: 4/);assert.match(mcr.stdout,/AUse\.rec_1/);assert.match(mcr.stdout,/AUse\.rec_2/);
 const local=path.join(dir,'LocalBad.lean');fs.writeFileSync(local,`set_option inductive.autoPromoteIndices false\ninductive PairT.{u} (P Q : Type u) : Type u where | mk (p : P) (q : Q) : PairT P Q\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Type u where | step (n : Nat) (x : PairT (PairT (B α n) (B α n)) (PairT (B α n) (B α n))) : A α n\n inductive B (α : Type u) : Nat → Type u where | base (n : Nat) : B α n\nend\n`);const lr=spawnSync(lean,[local],{encoding:'utf8'});assert.notEqual(lr.status,0);assert.match(lr.stderr+lr.stdout,/nested inductive datatypes parameters cannot contain local variables/);
 const potential=path.join(dir,'Potential.lean');fs.writeFileSync(potential,`universe u\nmutual\n inductive A : Sort u where | mk : A\n inductive B : Sort u where | mk : B\nend\n`);const pr=spawnSync(lean,[potential],{encoding:'utf8'});assert.notEqual(pr.status,0);assert.match(pr.stderr+pr.stdout,/Invalid universe polymorphic resulting type/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_FINAL_GENERALIZATION_AUDIT_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-final-generalization-audit0',coreFormat:66,status:'accepted',supportedSlice:'v65 breadth-first definitionally deduplicated nonlinear mutual/nested helper graph generalized across Prop or a shared provably nonzero Type result universe, including monomorphic/polymorphic and indexed/non-indexed blocks',observations:{typeNonlinearGraph:'accepted',monomorphicType0IndexedGraph:'accepted',monomorphicType0NonIndexedGraph:'accepted',higherOrderNestedCodomain:'accepted',higherOrderRecursiveContainerParameter:'accepted',higherOrderLocalIndexCapture:'rejected',mixedMutualResultUniverse:'rejected',mutuallyRecursiveContainerFamily:'accepted',motiveCount:4,typeFreshMotiveUniverse:'accepted',outerRecursiveSlots:2,innerRecursiveSlots:2,linkedTypeIota:'accepted',propRegression:'accepted',localTargetIndexCapture:'rejected',potentialSortUniverse:'rejected',serializedReplay:'accepted'},historicalIsolation:{v65TypeNonlinearGraph:'rejected',v65PotentialSortHistoricalAcceptance:'preserved'},remainingAudit:{conversionOverall:'partial',resourceBounds:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v66 final mutual/nested Sort/monomorphic/higher-order/container-closure generalization audit, Type+Prop nonlinear helper graphs, linked Type iota, universe hardening, locality, replay, v65 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
