import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelSucc,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperMultipleFieldsArtifact,makeKernelMutualNestedDeeperDependentContainerParametersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const Z=levelOfNat(0),L1=levelOfNat(1),U={tag:'param',name:'u'};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const Prop=S(Z),TU=S(levelSucc(U));
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true,allowMutualNestedDeeperDependentContainerParameters:true};
const env63=()=>new Environment(base),env64=()=>new Environment({...base,allowMutualNestedDeeperMultipleFields:true});

const Bool={kind:'inductive',name:'BoolMN64',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BoolMN64.false',type:C('BoolMN64')},{name:'BoolMN64.true',type:C('BoolMN64')}]};
const Ix={kind:'inductive',name:'IxMN64',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'IxMN64.z',type:C('IxMN64')}]};
const TrueP={kind:'inductive',name:'TrueMN64',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'TrueMN64.intro',type:C('TrueMN64')}]};
const OutP={kind:'inductive',name:'OutPMN64',levelParams:[],type:Prop,numParams:0,numIndices:0,constructors:[{name:'OutPMN64.out',type:C('OutPMN64')}]};
// DWrap (P : Prop) (Q : P -> Prop) : Bool -> Prop; constructor inhabits true.
const DWrap={kind:'inductive',name:'DWrapMN64',levelParams:[],type:Pi(Prop,Pi(Pi(B(0),Prop),Pi(C('BoolMN64'),Prop))),numParams:2,numIndices:1,constructors:[{name:'DWrapMN64.mk',type:Pi(Prop,Pi(Pi(B(0),Prop),Pi(B(1),Pi(App(B(1),B(0)),Apps(C('DWrapMN64'),[B(3),B(2),C('BoolMN64.true')])))))}]};
const ix=C('IxMN64'),z=C('IxMN64.z'),bool=C('BoolMN64'),tru=C('BoolMN64.true'),fls=C('BoolMN64.false'),tp=C('TrueMN64'),tpi=C('TrueMN64.intro');
const target=(alpha,name='BMN64')=>Apps(C(name,[U]),[alpha,z]);
const qfun=p=>Lam(p,tp);
const inner=(alpha,idx=tru,name='BMN64')=>{const p=target(alpha,name);return Apps(C('DWrapMN64'),[p,qfun(p),idx]);};
const outerFrom=(innerTy,idx=tru)=>Apps(C('DWrapMN64'),[innerTy,qfun(innerTy),idx]);
const outer=(alpha,innerIdx=tru,outerIdx=tru,name='BMN64')=>outerFrom(inner(alpha,innerIdx,name),outerIdx);

const Identical={kind:'mutualInductive',name:'IdenticalFieldsMN64',levelParams:['u'],inductives:[
 {name:'AMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'AMN64.leaf',type:Pi(TU,Apps(C('AMN64',[U]),[B(0),z]))},
  {name:'AMN64.step',type:Pi(TU,Pi(ix,Pi(outer(B(1)),Pi(outer(B(2)),Apps(C('AMN64',[U]),[B(3),B(2)])))))}]},
 {name:'BMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BMN64.back',type:Pi(TU,Pi(ix,Pi(Apps(C('AMN64',[U]),[B(1),B(0)]),Apps(C('BMN64',[U]),[B(2),B(1)]))))}]},
]};

const Distinct={kind:'mutualInductive',name:'DistinctFieldsMN64',levelParams:['u'],inductives:[
 {name:'ADMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[
  {name:'ADMN64.leaf',type:Pi(TU,Apps(C('ADMN64',[U]),[B(0),z]))},
  {name:'ADMN64.step',type:Pi(TU,Pi(ix,Pi(outer(B(1),tru,tru,'BDMN64'),Pi(outer(B(2),fls,fls,'BDMN64'),Apps(C('ADMN64',[U]),[B(3),B(2)])))))}]},
 {name:'BDMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BDMN64.back',type:Pi(TU,Pi(ix,Pi(Apps(C('ADMN64',[U]),[B(1),B(0)]),Apps(C('BDMN64',[U]),[B(2),B(1)]))))}]},
]};

// Frozen v63 rejects multiple deep fields; v64 deduplicates identical roots+inner helper.
{
 const old=env63();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(old,d);assert.throws(()=>checkAndAddDeclaration(old,Identical),/exactly one linear deep recursive field|v63/i);
 const e=env64();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,Identical);
 for(const n of ['AMN64.rec','BMN64.rec','AMN64.rec_1','AMN64.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN64.rec_3'),false);
 const r=e.get('AMN64.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,1,1]);
 const step=r.metadata.rules.find(x=>x.ctor==='AMN64.step');assert.ok(step);const used=(step.recursiveRecursors??[]).filter(Boolean);assert.equal(used.filter(x=>x==='AMN64.rec_1').length,2,`expected both identical fields to reuse rec_1: ${JSON.stringify(used)}`);
 assert.deepEqual(checked.generated,['AMN64.leaf','AMN64.step','BMN64.back','AMN64.rec','BMN64.rec','AMN64.rec_1','AMN64.rec_2']);
}

// Distinct outer specializations share the same inner helper: exactly five motives / rec_1..rec_3.
{
 const e=env64();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Distinct);
 for(const n of ['ADMN64.rec','BDMN64.rec','ADMN64.rec_1','ADMN64.rec_2','ADMN64.rec_3'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('ADMN64.rec_4'),false);
 const r=e.get('ADMN64.rec').declaration;assert.equal(r.metadata.mutual.motiveCount,5);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,1,1,1]);
 const step=r.metadata.rules.find(x=>x.ctor==='ADMN64.step');assert.ok(step);const used=(step.recursiveRecursors??[]).filter(Boolean);assert.ok(used.includes('ADMN64.rec_1'));assert.ok(used.includes('ADMN64.rec_2'));
 const h1=e.get('ADMN64.rec_1').declaration.metadata.rules[0],h2=e.get('ADMN64.rec_2').declaration.metadata.rules[0];assert.ok((h1.recursiveRecursors??[]).includes('ADMN64.rec_3'));assert.ok((h2.recursiveRecursors??[]).includes('ADMN64.rec_3'));
}

// Actual iota with two identical fields crosses the shared outer and inner helper graph.
{
 const e=env64();for(const d of [Bool,Ix,TrueP,OutP,DWrap])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Identical);
 const alpha=ix,b0=Apps(C('BMN64',[Z]),[alpha,z]),iq=qfun(b0),innerTy=Apps(C('DWrapMN64'),[b0,iq,tru]),oq=qfun(innerTy),outerTy=Apps(C('DWrapMN64'),[innerTy,oq,tru]),out=C('OutPMN64');
 const args=[alpha,
  Lam(ix,Lam(Apps(C('AMN64',[Z]),[alpha,B(0)]),out)),Lam(ix,Lam(Apps(C('BMN64',[Z]),[alpha,B(0)]),out)),
  Lam(bool,Lam(Apps(C('DWrapMN64'),[innerTy,oq,B(0)]),out)),Lam(bool,Lam(Apps(C('DWrapMN64'),[b0,iq,B(0)]),out)),
  C('OutPMN64.out'),
  // step minor: n, x, y, ihx, ihy
  Lam(ix,Lam(outerTy,Lam(outerTy,Lam(out,Lam(out,B(0)))))),
  Lam(ix,Lam(Apps(C('AMN64',[Z]),[alpha,B(0)]),Lam(out,B(0)))),
  Lam(innerTy,Lam(tp,Lam(out,B(0)))),
  Lam(b0,Lam(tp,Lam(out,B(0)))),
 ];
 const leaf=App(C('AMN64.leaf',[Z]),alpha),back=Apps(C('BMN64.back',[Z]),[alpha,z,leaf]);
 const innerVal=Apps(C('DWrapMN64.mk'),[b0,iq,back,tpi]),outerVal=Apps(C('DWrapMN64.mk'),[innerTy,oq,innerVal,tpi]);
 const major=Apps(C('AMN64.step',[Z]),[alpha,z,outerVal,outerVal]),term=Apps(C('AMN64.rec',[Z]),[...args,z,major]);
 const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('OutPMN64.out')),`v64 linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Constructor-local dependent parameter capture remains rejected.
{
 const qTy=alpha=>Pi(target(alpha,'BLMN64'),Prop);
 const badField=alpha=>{const p=target(alpha,'BLMN64'),innerBad=Apps(C('DWrapMN64'),[p,B(0),tru]);return Apps(C('DWrapMN64'),[innerBad,qfun(innerBad),tru]);};
 const D={kind:'mutualInductive',name:'BadLocalMN64',levelParams:['u'],inductives:[
  {name:'ALMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'ALMN64.step',type:Pi(TU,Pi(ix,Pi(qTy(B(1)),Pi(badField(B(2)),Pi(outer(B(3),tru,tru,'BLMN64'),Apps(C('ALMN64',[U]),[B(4),B(3)]))))))}]},
  {name:'BLMN64',type:Pi(TU,Pi(ix,Prop)),numParams:1,numIndices:1,constructors:[{name:'BLMN64.base',type:Pi(TU,Pi(ix,Apps(C('BLMN64',[U]),[B(1),B(0)])))}]},
 ]};
 const e=env64();for(const d of [Bool,Ix,TrueP,DWrap])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,D),/capture constructor\/index-local|dependent parameter|specialization|v64/i);
}

// Strict Core v64 replay and frozen-v63 isolation.
{
 const declarations=[Bool,Ix,TrueP,DWrap,Identical];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-multiple-fields0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-dependent-container-parameters0'),/exactly one linear deep recursive field|v63/i);
 const artifact=makeKernelMutualNestedDeeperMultipleFieldsArtifact(declarations);assert.equal(artifact.formatVersion,64);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-multiple-fields0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:63}),/unsupported v63 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper-dependent-container-parameters0'}),/unsupported v64 implementation profile/);
 const historical=makeKernelMutualNestedDeeperDependentContainerParametersArtifact([Bool,Ix,TrueP,DWrap]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/exactly one linear deep recursive field|v63/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v64-replay-')),file=path.join(dir,'v64.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v64-lean-'));
 const identical=path.join(dir,'Identical.lean');fs.writeFileSync(identical,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive DWrap (P : Prop) (Q : P → Prop) : Bool → Prop where | mk (p : P) (q : Q p) : DWrap P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) (x : DWrap (DWrap (B α 0) (fun _ => True) true) (fun _ => True) true) (y : DWrap (DWrap (B α 0) (fun _ => True) true) (fun _ => True) true) : A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n`);const ir=spawnSync(lean,[identical],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(ir.status,0,ir.stderr||ir.stdout);assert.match(ir.stdout,/number of motives: 4/);assert.doesNotMatch(ir.stdout,/A\.rec_3/);
 const distinct=path.join(dir,'Distinct.lean');fs.writeFileSync(distinct,`set_option inductive.autoPromoteIndices false\nset_option pp.universes true\nset_option pp.explicit true\ninductive DWrap (P : Prop) (Q : P → Prop) : Bool → Prop where | mk (p : P) (q : Q p) : DWrap P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | leaf : A α 0 | step (n : Nat) (x : DWrap (DWrap (B α 0) (fun _ => True) true) (fun _ => True) true) (y : DWrap (DWrap (B α 0) (fun _ => True) false) (fun _ => True) false) : A α n\n inductive B (α : Type u) : Nat → Prop where | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\n#print A.rec_3\n`);const dr=spawnSync(lean,[distinct],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.equal(dr.status,0,dr.stderr||dr.stdout);assert.match(dr.stdout,/number of motives: 5/);assert.match(dr.stdout,/A\.rec_3/);
 const bad=path.join(dir,'BadLocal.lean');fs.writeFileSync(bad,`set_option inductive.autoPromoteIndices false\ninductive DWrap (P : Prop) (Q : P → Prop) : Bool → Prop where | mk (p : P) (q : Q p) : DWrap P Q true\nuniverse u\nmutual\n inductive A (α : Type u) : Nat → Prop where | step (n : Nat) (Q : (B α 0) → Prop) (x : DWrap (DWrap (B α 0) Q true) (fun _ => True) true) (y : DWrap (DWrap (B α 0) (fun _ => True) true) (fun _ => True) true) : A α n\n inductive B (α : Type u) : Nat → Prop where | base (n : Nat) : B α n\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8',env:{...process.env,TERM:process.env.TERM||'xterm'}});assert.notEqual(br.status,0);assert.match((br.stderr||'')+(br.stdout||''),/nested inductive datatypes parameters cannot contain local variables/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_MULTIPLE_FIELDS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-multiple-fields0',coreFormat:64,status:'accepted',supportedSlice:'multiple compatible deep recursive fields in universe-polymorphic indexed Prop mutual/nested graphs through dependent multi-parameter indexed Prop containers, with Lean-compatible breadth-first helper deduplication by specialization',observations:{identicalFields:{motiveCount:4,helperReuse:'outer+inner'},distinctOuterSharedInner:{motiveCount:5,helperOrder:'roots first, shared inner next'},linkedIota:'accepted',localDependentParameterCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v63MultipleDeepFields:'rejected'},explicitGaps:{multipleRecursiveTopLevelParameterSlots:'unsupported',generalNonlinearRecursiveParameterGraphs:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v64 multiple deep fields, helper dedup/order, linked iota, dependent locality, replay, v63 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
