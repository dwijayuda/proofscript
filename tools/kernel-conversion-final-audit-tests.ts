import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {
  Environment,checkAndAddDeclaration,checkCoreDeclarations,defEq,expectedEqType,expectedEqReflType,
  infer,kernelWhnf,levelOfNat,sameTerm,pretty
} from '../packages/kernel/dist/index.js';
import {
  decodeArtifact,makeKernelConversionFinalAuditArtifact,makeKernelMutualNestedFinalGeneralizationAuditArtifact
} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const Z=levelOfNat(0),L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const D=(name,type,value,reducibility='regular')=>({kind:'definition',name,levelParams:[],type,value,reducibility});
const Ax=(name,type)=>({kind:'axiom',name,levelParams:[],type});
const exactEq=()=>({kind:'inductive',name:'Eq',levelParams:['u'],type:expectedEqType('u'),numParams:2,numIndices:1,constructors:[{name:'Eq.refl',type:expectedEqReflType('u')}]});
const envBase={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true,allowMutualNestedDeeperParameters:true,allowMutualNestedDeeperIndices:true,allowMutualNestedDeeperPolymorphic:true,allowMutualNestedDeeperProp:true,allowMutualNestedDeeperIndexedContainers:true,allowMutualNestedDeeperMultiParameterContainers:true,allowMutualNestedDeeperDependentContainerParameters:true,allowMutualNestedDeeperMultipleFields:true,allowMutualNestedDeeperMultipleRecursiveParameterSlots:true,allowMutualNestedFinalGeneralizationAudit:true};
const env66=()=>new Environment(envBase),env67=()=>new Environment({...envBase,allowConversionFinalAudit:true});

// Transparent-head + partially-applied recursor.  This is the v66 bug found by
// the final conversion audit: unfolding the head exposes a stuck partial
// recursor application; after the caller's major is appended Lean re-flattens
// and iota-reduces the resulting spine.
const N=Ax('NC67',S(L1)),n0=Ax('n0C67',C('NC67')),n1=Ax('n1C67',C('NC67'));
const Bit={kind:'inductive',name:'BitC67',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BitC67.zero',type:C('BitC67')},{name:'BitC67.one',type:C('BitC67')}]};
const bitMotive=Lam(C('BitC67'),C('NC67'));
const chooser=D('chooserC67',Pi(C('BitC67'),C('NC67')),Apps(C('BitC67.rec',[L1]),[bitMotive,C('n0C67'),C('n1C67')]));
const Q=Ax('QC67',Pi(C('NC67'),S(L1))),q0=Ax('q0C67',App(C('QC67'),C('n0C67')));
const choice=App(C('chooserC67'),C('BitC67.zero'));
const witness=D('witnessC67',App(C('QC67'),choice),C('q0C67'));

{
  const e=env67();for(const d of [N,n0,n1,Bit,chooser,Q,q0,witness])checkAndAddDeclaration(e,d);
  assert.ok(sameTerm(kernelWhnf(e,choice),C('n0C67')),'v67 must re-flatten transparent recursor head and iota-reduce');
  assert.ok(defEq(e,[],choice,C('n0C67')),'v67 defEq must observe completed WHNF');
  assert.ok(sameTerm(kernelWhnf(e,infer(e,[],choice)),C('NC67')));
}
{
  const e=env66();for(const d of [N,n0,n1,Bit,chooser,Q,q0])checkAndAddDeclaration(e,d);
  const r=kernelWhnf(e,choice);assert.ok(!sameTerm(r,C('n0C67')),`v66 historical behavior unexpectedly changed: ${pretty(r)}`);
  assert.throws(()=>checkAndAddDeclaration(e,witness),/type mismatch/);
}

// The same spine-composition rule applies to kernel quotient computation, not
// just recursors.  A transparent definition can store Quot.lift without its
// quotient major, and the caller supplies that major later.
{
  const e=env67();checkAndAddDeclaration(e,exactEq());checkAndAddDeclaration(e,{kind:'quot',name:'Quot',levelParams:[]});
  const A=Ax('AC67',S(L1)),a=Ax('aC67',C('AC67'));for(const d of [A,a])checkAndAddDeclaration(e,d);
  const AT=C('AC67'),eqA=Apps(C('Eq',[L1]),[AT]);
  const f=Lam(AT,B(0));const sound=Lam(AT,Lam(AT,Lam(Apps(eqA,[B(1),B(0)]),B(0))));
  const q=Apps(C('Quot.mk',[L1]),[AT,eqA,C('aC67')]);
  const quotTy=Apps(C('Quot',[L1]),[AT,eqA]);
  const liftHead=D('liftHeadC67',Pi(quotTy,AT),Apps(C('Quot.lift',[L1,L1]),[AT,eqA,AT,f,sound]));
  checkAndAddDeclaration(e,liftHead);
  const applied=App(C('liftHeadC67'),q);
  assert.ok(sameTerm(kernelWhnf(e,applied),C('aC67')),'v67 transparent partial Quot.lift must compute after major is appended');
}

// Opaque heads remain opaque: the new continuation is strictly about
// transparent delta reduction and must not weaken the transparency boundary.
{
  const e=env67();for(const d of [N,n0,n1,Bit])checkAndAddDeclaration(e,d);
  const opaque={kind:'opaque',name:'opaqueChooserC67',levelParams:[],type:Pi(C('BitC67'),C('NC67')),value:Apps(C('BitC67.rec',[L1]),[bitMotive,C('n0C67'),C('n1C67')])};
  checkAndAddDeclaration(e,opaque);
  assert.ok(!defEq(e,[],App(C('opaqueChooserC67'),C('BitC67.zero')),C('n0C67')),'opaque heads must not delta/iota-reduce');
}

// Strict Core v67 replay and semantic isolation from frozen v66.
{
  const declarations=[N,n0,n1,Bit,chooser,Q,q0,witness];
  assert.equal(checkCoreDeclarations(declarations,'KERNEL-conversion-final-audit0').status,'accepted');
  assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-final-generalization-audit0'),/type mismatch/);
  const artifact=makeKernelConversionFinalAuditArtifact(declarations);assert.equal(artifact.formatVersion,67);assert.equal(artifact.implementationProfile,'KERNEL-conversion-final-audit0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:66}),/unsupported v66 implementation profile/);
  assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-final-generalization-audit0'}),/unsupported v67 implementation profile/);
  const historical=makeKernelMutualNestedFinalGeneralizationAuditArtifact([N,n0,n1,Bit,chooser,Q,q0]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/type mismatch/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v67-replay-')),file=path.join(dir,'v67.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NC67','n0C67','n1C67','QC67','q0C67']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 observations for the discovered cross-product and the
// opacity boundary.  Lean is assurance-only; standalone replay above does not
// invoke it.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v67-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive BitC67 where | zero | one\naxiom NC67 : Type\naxiom n0C67 : NC67\naxiom n1C67 : NC67\nnoncomputable def chooserC67 : BitC67 → NC67 := BitC67.rec (motive := fun _ => NC67) n0C67 n1C67\naxiom QC67 : NC67 → Type\naxiom q0C67 : QC67 n0C67\nnoncomputable def witnessC67 : QC67 (chooserC67 BitC67.zero) := q0C67\nexample : chooserC67 BitC67.zero = n0C67 := rfl\n\nuniverse u\nnoncomputable def liftHeadC67 {α : Sort u} : Quot (@Eq α) → α := Quot.lift (r := @Eq α) (fun x => x) (fun _ _ h => h)\nexample {α : Sort u} (a : α) : liftHeadC67 (Quot.mk (@Eq α) a) = a := rfl\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const bad=path.join(dir,'Opaque.lean');fs.writeFileSync(bad,`inductive BitC67 where | zero | one\naxiom NC67 : Type\naxiom n0C67 : NC67\naxiom n1C67 : NC67\nopaque opaqueChooserC67 : BitC67 → NC67 := BitC67.rec (motive := fun _ => NC67) n0C67 n1C67\nexample : opaqueChooserC67 BitC67.zero = n0C67 := rfl\n`);
  assert.notEqual(spawnSync(lean,[bad],{encoding:'utf8'}).status,0,'Lean must keep opaque head stuck');
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_CONVERSION_FINAL_AUDIT_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-conversion-final-audit0',coreFormat:67,status:'accepted',observations:{transparentPartialRecursor:'accepted/reduced',dependentTypeReplay:'accepted',transparentPartialQuotLift:'accepted/reduced',opaqueHead:'stuck/rejected-rfl'},historicalIsolation:{v66TransparentPartialRecursor:'stuck',v66DependentWitness:'rejected'},auditCoverage:['beta','zeta','delta/transparency','function eta','structure eta','proof irrelevance','projection iota','quotient computation','ordinary/indexed/mutual/nested recursor iota','RecursorVal.k','dependent binder contexts','transparent-head spine re-flattening'],remainingAudit:{resourceBounds:'partial'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
  console.log('✓ kernel v67 final conversion/WHNF audit cross-product, transparent-head recursor/quotient re-flattening, opacity, replay, v66 isolation, and exact Lean observations passed');
}else console.log('○ exact Lean v67 conversion oracle unavailable (standalone tests passed; differential pending)');
