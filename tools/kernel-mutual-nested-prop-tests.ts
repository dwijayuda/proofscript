import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,levelParam,levelSucc,LevelZero,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedPropArtifact,makeKernelMutualNestedPolymorphicArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),U=levelParam('u'),TU={tag:'sort',level:levelSucc(U)};
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Pis=(domains,body)=>domains.reduceRight((out,domain)=>Pi(domain,out),body),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true};
const env53=()=>new Environment(base),env54=()=>new Environment({...base,allowMutualNestedProp:true});

const WrapP={kind:'inductive',name:'WrapPMN54',levelParams:[],type:Pi(S(L0),S(L0)),numParams:1,numIndices:0,constructors:[{name:'WrapPMN54.mk',type:Pi(S(L0),Pi(B(0),App(C('WrapPMN54'),B(1))))}]};
const AB={kind:'mutualInductive',name:'ABMN54',levelParams:[],inductives:[
  {name:'AMN54',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'AMN54.leaf',type:C('AMN54')},{name:'AMN54.step',type:Pi(App(C('WrapPMN54'),C('BMN54')),C('AMN54'))}]},
  {name:'BMN54',type:S(L0),numParams:0,numIndices:0,constructors:[{name:'BMN54.back',type:Pi(C('AMN54'),C('BMN54'))}]},
]};

// Basic Prop mutual+nested graph: one shared Prop-only motive policy across A/B/helper.
{
  const e=env54();checkAndAddDeclaration(e,WrapP);const checked=checkAndAddDeclaration(e,AB);
  for(const n of ['AMN54','BMN54','AMN54.rec','BMN54.rec','AMN54.rec_1'])assert.ok(e.has(n),`missing ${n}`);
  const ar=e.get('AMN54.rec').declaration,br=e.get('BMN54.rec').declaration,hr=e.get('AMN54.rec_1').declaration;
  for(const r of [ar,br,hr]){assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,[],'Prop mutual+nested recursors must not introduce a motive universe');assert.equal(r.metadata.mutual.motiveCount,3);assert.deepEqual(r.metadata.mutual.indexCounts,[0,0,0]);}
  assert.match(pretty(ar.type),/AMN54.*Prop/);assert.match(pretty(ar.type),/BMN54.*Prop/);assert.match(pretty(ar.type),/WrapPMN54\(BMN54\).*Prop/);
  assert.deepEqual(checked.generated,['AMN54.leaf','AMN54.step','BMN54.back','AMN54.rec','BMN54.rec','AMN54.rec_1']);
}

// Actual linked proof iota: A.rec -> helper -> B.rec -> A.rec -> leaf.
{
  const e=env54();checkAndAddDeclaration(e,WrapP);checkAndAddDeclaration(e,AB);
  const R={kind:'axiom',name:'RMN54',levelParams:[],type:S(L0)},r={kind:'axiom',name:'rMN54',levelParams:[],type:C('RMN54')};for(const d of [R,r])checkAndAddDeclaration(e,d);
  const a=C('AMN54'),b=C('BMN54'),w=App(C('WrapPMN54'),b),out=C('RMN54');
  const ma=Lam(a,out),mb=Lam(b,out),mw=Lam(w,out);
  const leafMinor=C('rMN54'),stepMinor=Lam(w,Lam(out,B(0))),backMinor=Lam(a,Lam(out,B(0))),wrapMinor=Lam(b,Lam(out,B(0)));
  const leaf=C('AMN54.leaf'),back=App(C('BMN54.back'),leaf),wrapped=Apps(C('WrapPMN54.mk'),[b,back]),major=App(C('AMN54.step'),wrapped);
  const term=Apps(C('AMN54.rec'),[ma,mb,mw,leafMinor,stepMinor,backMinor,wrapMinor,major]);const reduced=kernelWhnf(e,term);
  assert.ok(sameTerm(reduced,C('rMN54')),`v54 linked Prop iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));

  const N={kind:'axiom',name:'NMN54',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0MN54',levelParams:[],type:C('NMN54')};for(const d of [N,n0])checkAndAddDeclaration(e,d);
  const bad=Apps(C('AMN54.rec'),[Lam(a,C('NMN54')),Lam(b,C('NMN54')),Lam(w,C('NMN54')),C('n0MN54'),Lam(w,Lam(C('NMN54'),C('n0MN54'))),Lam(a,Lam(C('NMN54'),C('n0MN54'))),Lam(b,Lam(C('NMN54'),C('n0MN54'))),C('AMN54.leaf')]);
  assert.throws(()=>infer(e,[],bad),/type mismatch|expected|sort/i,'v54 mutual+nested Prop must not eliminate into Type');
}

// Shared polymorphic parameter telescope is preserved, with no fresh motive universe.
const ParamAB={kind:'mutualInductive',name:'ParamABMN54',levelParams:['u'],inductives:[
  {name:'APMN54',type:Pi(TU,S(L0)),numParams:1,numIndices:0,constructors:[{name:'APMN54.leaf',type:Pi(TU,App(C('APMN54',[U]),B(0)))},{name:'APMN54.step',type:Pi(TU,Pi(App(C('WrapPMN54'),App(C('BPMN54',[U]),B(0))),App(C('APMN54',[U]),B(1))))}]},
  {name:'BPMN54',type:Pi(TU,S(L0)),numParams:1,numIndices:0,constructors:[{name:'BPMN54.back',type:Pi(TU,Pi(App(C('APMN54',[U]),B(0)),App(C('BPMN54',[U]),B(1))))}]},
]};
{
  const e=env54();checkAndAddDeclaration(e,WrapP);checkAndAddDeclaration(e,ParamAB);for(const n of ['APMN54.rec','BPMN54.rec','APMN54.rec_1']){const r=e.get(n).declaration;assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.equal(r.metadata.mutual.motiveCount,3);}assert.match(pretty(e.get('APMN54.rec').declaration.type),/APMN54\.\{u\}/);
}

// Fixed indexed target is supported; original family indices remain public, helper remains indexless.
const Nat={kind:'axiom',name:'NatMN54',levelParams:[],type:S(L1)},zero={kind:'axiom',name:'zeroMN54',levelParams:[],type:C('NatMN54')};
const Indexed={kind:'mutualInductive',name:'IndexedMN54',levelParams:['u'],inductives:[
  {name:'IAMN54',type:Pi(TU,Pi(C('NatMN54'),S(L0))),numParams:1,numIndices:1,constructors:[{name:'IAMN54.step',type:Pis([TU,C('NatMN54'),App(C('WrapPMN54'),Apps(C('IBMN54',[U]),[B(1),C('zeroMN54')]))],Apps(C('IAMN54',[U]),[B(2),B(1)]))}]},
  {name:'IBMN54',type:Pi(TU,Pi(C('NatMN54'),S(L0))),numParams:1,numIndices:1,constructors:[{name:'IBMN54.back',type:Pis([TU,C('NatMN54'),Apps(C('IAMN54',[U]),[B(1),B(0)])],Apps(C('IBMN54',[U]),[B(2),B(1)]))}]},
]};
{
  const e=env54();for(const d of [Nat,zero,WrapP])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Indexed);const r=e.get('IAMN54.rec').declaration;assert.equal(r.kind,'recursor');assert.deepEqual(r.levelParams,['u']);assert.deepEqual(r.metadata.mutual.indexCounts,[1,1,0]);assert.ok(e.has('IAMN54.rec_1'));
}

// Constructor-local target indices are an explicit v54 capability gap even though Lean promotes them.
const LocalIndexed={kind:'mutualInductive',name:'LocalIndexedMN54',levelParams:['u'],inductives:[
  {name:'LAMN54',type:Pi(TU,Pi(C('NatMN54'),S(L0))),numParams:1,numIndices:1,constructors:[{name:'LAMN54.step',type:Pis([TU,C('NatMN54'),App(C('WrapPMN54'),Apps(C('LBMN54',[U]),[B(1),B(0)]))],Apps(C('LAMN54',[U]),[B(2),B(1)]))}]},
  {name:'LBMN54',type:Pi(TU,Pi(C('NatMN54'),S(L0))),numParams:1,numIndices:1,constructors:[{name:'LBMN54.back',type:Pis([TU,C('NatMN54'),Apps(C('LAMN54',[U]),[B(1),B(0)])],Apps(C('LBMN54',[U]),[B(2),B(1)]))}]},
]};
{
  const e=env54();for(const d of [Nat,zero,WrapP])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,LocalIndexed),/v54 nested mutual target indices may depend only on shared mutual parameters/i);
}

// Historical v53 rejects this Prop graph; v54 strict codec/replay and relabel isolation.
{
  const declarations=[WrapP,AB];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-prop0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-polymorphic0'),/Prop|positive mutual occurrence|mutual recursion|constructor field|nested/i);
  const artifact=makeKernelMutualNestedPropArtifact(declarations);assert.equal(artifact.formatVersion,54);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-prop0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:53}),/unsupported v53 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-polymorphic0'}),/unsupported v54 implementation profile/);
  const historical=makeKernelMutualNestedPolymorphicArtifact([]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/Prop|positive mutual occurrence|mutual recursion|constructor field|nested/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-prop-v54-')),file=path.join(dir,'v54.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-prop-v54-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ninductive WrapP (P : Prop) : Prop where | mk : P → WrapP P\nmutual\n  inductive A : Prop where\n    | leaf : A\n    | step : WrapP B → A\n  inductive B : Prop where\n    | back : A → B\nend\n#print A.rec\n#print A.rec_1\nuniverse u\nmutual\n  inductive AP (α : Type u) : Prop where\n    | leaf : AP α\n    | step : WrapP (BP α) → AP α\n  inductive BP (α : Type u) : Prop where\n    | back : AP α → BP α\nend\n#print AP.rec\nmutual\n  inductive AI (α : Type u) : Nat → Prop where\n    | step (n : Nat) : WrapP (BI α 0) → AI α n\n  inductive BI (α : Type u) : Nat → Prop where\n    | back (n : Nat) : AI α n → BI α n\nend\n#print AI.rec\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 3/);assert.match(gr.stdout,/A → Prop/);assert.match(gr.stdout,/WrapP B → Prop/);assert.match(gr.stdout,/AP\.rec\.\{u\}/);assert.match(gr.stdout,/number of indices: 1/);
  const badLarge=path.join(dir,'BadLarge.lean');fs.writeFileSync(badLarge,`inductive WrapP (P : Prop) : Prop where | mk : P → WrapP P\nmutual\n  inductive A : Prop where | leaf : A | step : WrapP B → A\n  inductive B : Prop where | back : A → B\nend\nexample (a : A) : Nat := A.rec (motive_1 := fun _ => Nat) (motive_2 := fun _ => Nat) (motive_3 := fun _ => Nat) 0 (fun _ _ => 0) (fun _ _ => 0) (fun _ _ => 0) a\n`);const bl=spawnSync(lean,[badLarge],{encoding:'utf8'});assert.notEqual(bl.status,0);assert.match(bl.stderr+bl.stdout,/expected to have type\s+Prop|type mismatch/i);
  const promoted=path.join(dir,'PromotedLocal.lean');fs.writeFileSync(promoted,`set_option pp.universes true\nset_option pp.explicit true\ninductive WrapP (P : Prop) : Prop where | mk : P → WrapP P\nuniverse u\nmutual\n  inductive A (α : Type u) : Nat → Prop where\n    | step (n : Nat) : WrapP (B α n) → A α n\n  inductive B (α : Type u) : Nat → Prop where\n    | back (n : Nat) : A α n → B α n\nend\n#print A.rec\n`);const pl=spawnSync(lean,[promoted],{encoding:'utf8'});assert.equal(pl.status,0,pl.stderr||pl.stdout);assert.match(pl.stdout,/number of parameters: 2/);assert.match(pl.stdout,/number of motives: 3/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_PROP_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-prop0',coreFormat:54,status:'accepted',supportedSlice:'Prop-valued one-level mutual+nested graphs with zero/fixed/shared-parameter-derived target indices, shared parameters, explicit universe parameters, Prop-only motives, and linked helper iota',observations:{basicMutualNestedProp:'accepted',linkedProofIota:'accepted',propOnlyMotiveUniverse:'accepted',largeElimination:'rejected',sharedPolymorphicParameters:'accepted',fixedIndexedTarget:'accepted',serializedReplay:'accepted'},historicalIsolation:{v53MutualNestedProp:'rejected'},explicitGaps:{promotedConstructorLocalPropIndices:'unsupported by ProofScript v54 though accepted by exact Lean 4.33.1',deeperMutualNestedGraphs:'unsupported',indexedNestedContainers:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v54 bounded mutual+nested Prop preprocessing, shared Prop-only motives, linked proof iota, parameters/fixed indices, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
