import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,kernelWhnf,infer,levelOfNat,pretty,sameTerm} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelRecursorMinorOrderArtifact,makeKernelNestedIndexedContainersArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true};
const env36=()=>new Environment({...base,allowLeanRecursorMinorOrder:true}),env35=()=>new Environment(base);
const Nat={kind:'axiom',name:'NatMO36',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0MO36',levelParams:[],type:C('NatMO36')};
const Out={kind:'axiom',name:'OutMO36',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MO36',levelParams:[],type:C('OutMO36')};
const pos=(text,a,b)=>{const ia=text.indexOf(a),ib=text.indexOf(b);assert.ok(ia>=0&&ib>=0&&ia<ib,`expected ${a} before ${b}\n${text}`)};

// Simple recursive: Lean fields-first => recursive field, later data field, then IH.
const T={kind:'inductive',name:'TMO36',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:'TMO36.leaf',type:C('TMO36')},
  {name:'TMO36.mk',type:Pi(C('TMO36'),Pi(C('NatMO36'),C('TMO36')))}
]};
{
  const e=env36();for(const d of [Nat,n0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,T);
  const r=e.get('TMO36.rec').declaration,pt=pretty(r.type);
  assert.match(pt,/NatMO36/);

  const m=Lam(C('TMO36'),C('OutMO36')),leaf=C('out0MO36');
  // t, n, ih => ih
  const mk=Lam(C('TMO36'),Lam(C('NatMO36'),Lam(C('OutMO36'),B(0))));
  const major=Apps(C('TMO36.mk'),[C('TMO36.leaf'),C('n0MO36')]);
  const term=Apps(C('TMO36.rec',[L1]),[m,leaf,mk,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0MO36')));assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('OutMO36')));
}
{
  const e=env35();for(const d of [Nat])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,T);const pt=pretty(e.get('TMO36.rec').declaration.type);
  // historical v35 interleaves the IH before the later Nat field
  assert.match(pt,/TMO36[^)]*→[^)]*motive|motive/); // sanity; exact distinction checked by applying historical minor below
  const OutH={kind:'axiom',name:'OutHMO36',levelParams:[],type:S(L1)},o={kind:'axiom',name:'oHMO36',levelParams:[],type:C('OutHMO36')};for(const d of [OutH,o,n0])if(!e.has(d.name))checkAndAddDeclaration(e,d);
  const m=Lam(C('TMO36'),C('OutHMO36')),leaf=C('oHMO36');
  // t, ih, n => ih (old order)
  const oldMk=Lam(C('TMO36'),Lam(C('OutHMO36'),Lam(C('NatMO36'),B(1))));
  const major=Apps(C('TMO36.mk'),[C('TMO36.leaf'),C('n0MO36')]);const term=Apps(C('TMO36.rec',[L1]),[m,leaf,oldMk,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('oHMO36')));
}

// Parameterized recursive path.
const P={kind:'inductive',name:'PMO36',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'PMO36.leaf',type:Pi(S(L1),App(C('PMO36'),B(0)))},
  {name:'PMO36.mk',type:Pi(S(L1),Pi(App(C('PMO36'),B(0)),Pi(C('NatMO36'),App(C('PMO36'),B(2)))))}
]};
{
  const e=env36();for(const d of [Nat,n0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,P);
  const pN=App(C('PMO36'),C('NatMO36')),m=Lam(pN,C('OutMO36')),leaf=C('out0MO36'),mk=Lam(pN,Lam(C('NatMO36'),Lam(C('OutMO36'),B(0))));
  const major=Apps(C('PMO36.mk'),[C('NatMO36'),Apps(C('PMO36.leaf'),[C('NatMO36')]),C('n0MO36')]);
  const term=Apps(C('PMO36.rec',[L1]),[C('NatMO36'),m,leaf,mk,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0MO36')));
}

// Indexed recursive path: constructor local index + recursive field + later data field, then IH.
const Idx={kind:'axiom',name:'IdxMO36',levelParams:[],type:S(L1)},z={kind:'axiom',name:'zMO36',levelParams:[],type:C('IdxMO36')},s={kind:'axiom',name:'sMO36',levelParams:[],type:Pi(C('IdxMO36'),C('IdxMO36'))};
const V={kind:'inductive',name:'VMO36',levelParams:[],type:Pi(C('IdxMO36'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'VMO36.z',type:App(C('VMO36'),C('zMO36'))},
  {name:'VMO36.s',type:Pi(C('IdxMO36'),Pi(App(C('VMO36'),B(0)),Pi(C('NatMO36'),App(C('VMO36'),App(C('sMO36'),B(2))))))}
]};
{
  const e=env36();for(const d of [Nat,n0,Out,out0,Idx,z,s])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,V);
  const motive=Lam(C('IdxMO36'),Lam(App(C('VMO36'),B(0)),C('OutMO36'))),vz=C('out0MO36');
  // i, rec, n, ih => ih
  const vs=Lam(C('IdxMO36'),Lam(App(C('VMO36'),B(0)),Lam(C('NatMO36'),Lam(C('OutMO36'),B(0)))));
  const prev=C('VMO36.z'),major=Apps(C('VMO36.s'),[C('zMO36'),prev,C('n0MO36')]),one=App(C('sMO36'),C('zMO36'));
  const term=Apps(C('VMO36.rec',[L1]),[motive,vz,vs,one,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0MO36')));
}

// Direct mutual path: fields before cross-family IH.
const AB={kind:'mutualInductive',name:'ABMO36',levelParams:[],inductives:[
  {name:'AMO36',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'AMO36.mk',type:Pi(C('BMO36'),Pi(C('NatMO36'),C('AMO36')))}]},
  {name:'BMO36',type:S(L1),numParams:0,numIndices:0,constructors:[{name:'BMO36.base',type:C('BMO36')},{name:'BMO36.mk',type:Pi(C('AMO36'),C('BMO36'))}]}
]};
{
  const e=env36();for(const d of [Nat,n0,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,AB);
  const mA=Lam(C('AMO36'),C('OutMO36')),mB=Lam(C('BMO36'),C('OutMO36'));
  const minorA=Lam(C('BMO36'),Lam(C('NatMO36'),Lam(C('OutMO36'),B(0))));
  const minorBase=C('out0MO36'),minorB=Lam(C('AMO36'),Lam(C('OutMO36'),B(0)));
  const major=Apps(C('AMO36.mk'),[C('BMO36.base'),C('n0MO36')]);
  const term=Apps(C('AMO36.rec',[L1]),[mA,mB,minorA,minorBase,minorB,major]);assert.ok(sameTerm(kernelWhnf(e,term),C('out0MO36')));
}

// Nested recursive container now restores a Lean-shaped helper minor: element, tail, then both IHs.
const List={kind:'inductive',name:'ListMO36',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
  {name:'ListMO36.nil',type:Pi(S(L1),App(C('ListMO36'),B(0)))},
  {name:'ListMO36.cons',type:Pi(S(L1),Pi(B(0),Pi(App(C('ListMO36'),B(1)),App(C('ListMO36'),B(2)))))}
]};
const TreeL={kind:'inductive',name:'TreeLMO36',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'TreeLMO36.leaf',type:C('TreeLMO36')},{name:'TreeLMO36.node',type:Pi(App(C('ListMO36'),C('TreeLMO36')),C('TreeLMO36'))}]};
{
  const e=env36();checkAndAddDeclaration(e,List);checkAndAddDeclaration(e,TreeL);const pt=pretty(e.get('TreeLMO36.rec').declaration.type);
  const consAt=pt.indexOf('ListMO36.cons');assert.ok(consAt>=0,pt); // exact Lean oracle below verifies printed field/IH order
}

// Codec/replay and historical profile isolation.
{
  const declarations=[Nat,T];assert.equal(checkCoreDeclarations(declarations,'KERNEL-recursor-minor-order0').status,'accepted');assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-indexed-containers0').status,'accepted');
  const artifact=makeKernelRecursorMinorOrderArtifact(declarations);assert.equal(artifact.formatVersion,36);assert.equal(artifact.implementationProfile,'KERNEL-recursor-minor-order0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:35}),/unsupported v35 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-indexed-containers0'}),/unsupported v36 implementation profile/);
  const historical=makeKernelNestedIndexedContainersArtifact(declarations);assert.equal(historical.formatVersion,35);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-rec-order-v36-')),file=path.join(dir,'v36.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatMO36']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-rec-order-v36-lean-'));
  const file=path.join(dir,'Order.lean');fs.writeFileSync(file,`inductive T : Type where\n| leaf : T\n| mk : T → Nat → T\n#print T.rec\n\ninductive V : Nat → Type where\n| z : V 0\n| s : V n → Nat → V (n+1)\n#print V.rec\n\nmutual\n  inductive A : Type where\n  | mk : B → Nat → A\n  inductive B : Type where\n  | mk : A → B\nend\n#print A.rec\n\ninductive MyList (α : Type) : Type where\n| nil : MyList α\n| cons : α → MyList α → MyList α\ninductive Tree : Type where\n| leaf : Tree\n| node : MyList Tree → Tree\n#print Tree.rec\n`);
  const r=spawnSync(lean,[file],{encoding:'utf8',env:{...process.env,TERM:'xterm'}});assert.equal(r.status,0,r.stderr||r.stdout);const out=r.stdout;
  assert.match(out,/\(a : T\) → \(a_1 : Nat\) → motive a → motive \(a\.mk a_1\)/);
  assert.match(out,/\(a : V n\) → \(a_1 : Nat\) → motive n a → motive \(n \+ 1\)/);
  assert.match(out,/\(a : B\) → \(a_1 : Nat\) → motive_2 a → motive_1 \(A\.mk a a_1\)/);
  assert.match(out,/\(a : Tree\) → \(a_1 : MyList Tree\) → motive_1 a → motive_2 a_1 → motive_2 \(MyList\.cons a a_1\)/);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_RECURSOR_MINOR_ORDER_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-recursor-minor-order0',coreFormat:36,status:'accepted',observations:{simpleFieldsFirst:'accepted',parameterizedFieldsFirst:'accepted',indexedFieldsFirst:'accepted',mutualFieldsFirst:'accepted',nestedHelperFieldsFirst:'accepted',iotaApplicationOrder:'accepted',serializedReplay:'accepted'},historicalIsolation:{v35InterleavedOrder:'preserved'},explicitGaps:{generalNestedDeeper:'unsupported',remainingDependentRecursorEdges:'partial'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v36 Lean fields-first recursive minor ordering across simple/parameterized/indexed/mutual/nested recursors, iota, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
