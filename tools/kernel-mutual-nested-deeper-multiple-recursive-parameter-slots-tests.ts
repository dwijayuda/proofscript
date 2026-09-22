import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperMultipleRecursiveParameterSlotsArtifact,makeKernelMutualNestedDeeperMultipleFieldsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true,allowMutualNestedDeeperDependentContainerParameters:true,allowMutualNestedDeeperMultipleFields:true};
const env64=()=>new Environment(base),env65=()=>new Environment({...base,allowMutualNestedDeeperMultipleRecursiveParameterSlots:true});

const Ix={kind:'inductive',name:'IxMN65',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN65.z',type:C('IxMN65')},{name:'IxMN65.s',type:C('IxMN65')}]};
const OutP={kind:'inductive',name:'OutPMN65',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN65.out',type:C('OutPMN65')}]};
// PairP (P Q : Prop) : Prop, with both parameters represented as constructor fields.
const PairP={kind:'inductive',name:'PairPMN65',levelParams:[],type:Pi(Prop,Pi(Prop,Prop)),numParams:2,numIndices:0,constructors:[{name:'PairPMN65.mk',type:Pi(Prop,Pi(Prop,Pi(B(1),Pi(B(1),Apps(C('PairPMN65'),[B(3),B(2)])))))}]};
const ix=C('IxMN65'),z=C('IxMN65.z'),s=C('IxMN65.s');
const target=(alpha,index=z,name='BMN65')=>Apps(C(name,[U]),[alpha,index]);
const inner=(alpha,index=z,name='BMN65')=>Apps(C('PairPMN65'),[target(alpha,index,name),target(alpha,index,name)]);
const outer=(alpha,index=z,name='BMN65')=>Apps(C('PairPMN65'),[inner(alpha,index,name),inner(alpha,index,name)]);

const MultiSlots={kind:'mutualInductive',name:'MultiSlotsMN65',levelParams:['u'],inductives:[
 {name:'AMN65',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'AMN65.leaf',type:Pi(TU,Apps(C('AMN65',[U]),[B(0),z]))},
  {name:'AMN65.step',type:Pi(TU,Pi(ix,Pi(outer(B(1)),Apps(C('AMN65',[U]),[B(2),B(1)]))))}]},
 {name:'BMN65',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BMN65.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN65',[U]),[B(1),B(0)]),Apps(C('BMN65',[U]),[B(2),B(1)]))))}]},
]};

// v64 rejects a helper layer with two recursive carrier slots; v65 builds one shared graph.
{
 const old=env64();for(const d of [Ix,PairP])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,MultiSlots),/exactly one top-level recursive carrier|v64|recursive carrier/i);
 const e=env65();for(const d of [Ix,PairP])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,MultiSlots);
 for(const n of ['AMN65.rec','BMN65.rec','AMN65.rec_1','AMN65.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN65.rec_3'),false);
 const r=e.get('AMN65.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0,0]);
 const outerRule=e.get('AMN65.rec_1').declaration.metadata.rules[0],innerRule=e.get('AMN65.rec_2').declaration.metadata.rules[0];
 assert.deepEqual(outerRule.recursiveFields,[true,true]);assert.deepEqual(outerRule.recursiveRecursors,['AMN65.rec_2','AMN65.rec_2']);
 assert.deepEqual(innerRule.recursiveFields,[true,true]);assert.deepEqual(innerRule.recursiveRecursors,['BMN65.rec','BMN65.rec']);
 assert.deepEqual(checked.generated,['AMN65.leaf','AMN65.step','BMN65.back','AMN65.rec','BMN65.rec','AMN65.rec_1','AMN65.rec_2']);
}

// Actual linked iota crosses both multiple-recursive-slot helper layers.
{
 const e=env65();for(const d of [Ix,OutP,PairP])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,MultiSlots);
 const alpha=ix,b0=Apps(C('BMN65',[Z]),[alpha,z]),innerTy=Apps(C('PairPMN65'),[b0,b0]),outerTy=Apps(C('PairPMN65'),[innerTy,innerTy]),out=C('OutPMN65');
 const args=[alpha,
  Lam(ix,Lam(Apps(C('AMN65',[Z]),[alpha,B(0)]),out)),Lam(ix,Lam(Apps(C('BMN65',[Z]),[alpha,B(0)]),out)),
  Lam(outerTy,out),Lam(innerTy,out),
  C('OutPMN65.out'),
  Lam(ix,Lam(outerTy,Lam(out,B(0)))),
  Lam(ix,Lam(Apps(C('AMN65',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  // PairP minor order: x, y, ih(x), ih(y).
  Lam(innerTy,Lam(innerTy,Lam(out,Lam(out,B(1))))),
  Lam(b0,Lam(b0,Lam(out,Lam(out,B(1))))),
 ];
 const leaf=App(C('AMN65.leaf',[Z]),alpha),b1=Apps(C('BMN65.back',[Z]),[alpha,z,leaf]),b2=Apps(C('BMN65.back',[Z]),[alpha,z,leaf]);
 const i1=Apps(C('PairPMN65.mk'),[b0,b0,b1,b2]),i2=Apps(C('PairPMN65.mk'),[b0,b0,b2,b1]),outerVal=Apps(C('PairPMN65.mk'),[innerTy,innerTy,i1,i2]);
 const major=Apps(C('AMN65.step',[Z]),[alpha,s,outerVal]),term=Apps(C('AMN65.rec',[Z]),[...args,s,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN65.out')),`v65 linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// A constructor-local target index buried in a recursive parameter remains forbidden.
{
 const Bad={kind:'mutualInductive',name:'BadLocalMN65',levelParams:['u'],inductives:[
  {name:'ALMN65',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'ALMN65.step',type:Pi(TU,Pi(ix,Pi(Apps(C('PairPMN65'),[inner(B(1),B(0),'BLMN65'),inner(B(1),B(0),'BLMN65')]),Apps(C('ALMN65',[U]),[B(2),B(1)]))))}]},
  {name:'BLMN65',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BLMN65.base',type:Pi(TU,Pi(ix,Apps(C('BLMN65',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env65();for(const d of [Ix,PairP])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/capture constructor\/index-local|specialization|v65/i);
}

// Strict Core v65 replay and frozen-v64 isolation.
{
 const declarations=[Ix,PairP,MultiSlots];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multiple-fields0'),/exactly one top-level recursive carrier|v64|recursive carrier/i);
 const artifact=makeKernelMutualNestedDeeperMultipleRecursiveParameterSlotsArtifact(declarations);assert.equal(artifact.formatVersion,65);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:64}),/unsupported v64 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-multiple-fields0'}),/unsupported v65 implementation profile/);
 const historical=makeKernelMutualNestedDeeperMultipleFieldsArtifact([Ix,PairP]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/exactly one top-level recursive carrier|v64|recursive carrier/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v65-replay-')),file=path.join(dir,'v65.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v65-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive PairP (P Q : Prop) : Prop where | mk (p : P) (q : Q) : PairP P Q\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) (x : PairP (PairP (B α 0) (B α 0)) (PairP (B α 0) (B α 0))) : A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const gr=spawnSync(lean,[good],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/A\.rec_1/);assert.match(gr.stdout,/A\.rec_2/);assert.doesNotMatch(gr.stdout,/A\.rec_3/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive PairP (P Q : Prop) : Prop where | mk (p : P) (q : Q) : PairP P Q\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | step (n : Nat) (x : PairP (PairP (B α n) (B α n)) (PairP (B α n) (B α n))) : A α n\n inductive B (α : Type u) : Nat → Prop where | base (n : Nat) : B α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.notEqual(br.status,0);assert.match((br.stderr||'')+(br.stdout||''),/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_MULTIPLE_RECURSIVE_PARAMETER_SLOTS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0',coreFormat:65,status:'accepted',supportedSlice:'deep universe-polymorphic indexed Prop mutual/nested graphs where a helper container may carry recursive paths in multiple parameter slots; helper graph is breadth-first and definitionally deduplicated',observations:{motiveCount:4,outerRecursiveSlots:2,innerRecursiveSlots:2,outerSharedHelper:'A.rec_2 twice',innerSharedTarget:'B.rec twice',linkedIota:'accepted',localTargetIndexCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v64MultipleRecursiveParameterSlots:'rejected'},explicitGaps:{generalMutualNestedAudit:'pending',conversionOverall:'partial',resourceBounds:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v65 multiple recursive parameter slots, helper sharing, linked iota, locality, replay, v64 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
