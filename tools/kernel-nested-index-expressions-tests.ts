import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelNestedIndexExpressionsArtifact,makeKernelNestedIndicesArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1); const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true};
const env32=()=>new Environment({...base,allowNestedIndexExpressions:true}),env31=()=>new Environment(base);

const Nat={kind:'axiom',name:'NatNIE32',levelParams:[],type:S(L1)};
const zero={kind:'axiom',name:'zeroNIE32',levelParams:[],type:C('NatNIE32')};
const one={kind:'axiom',name:'oneNIE32',levelParams:[],type:C('NatNIE32')};
const succ={kind:'axiom',name:'succNIE32',levelParams:[],type:Pi(C('NatNIE32'),C('NatNIE32'))};
const add={kind:'axiom',name:'addNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),C('NatNIE32')))};
const Box={kind:'inductive',name:'BoxNIE32',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxNIE32.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxNIE32'),B(1))))}]};

// Fixed nested specialization whose index is exactly the uniform outer parameter p.
const ParamIndex={kind:'inductive',name:'ParamIndexNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'ParamIndexNIE32.leaf',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Apps(C('ParamIndexNIE32'),[B(1),B(0)])))},
  {name:'ParamIndexNIE32.node',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(App(C('BoxNIE32'),Apps(C('ParamIndexNIE32'),[B(1),B(1)])),Apps(C('ParamIndexNIE32'),[B(2),B(1)]))))},
]};
{
  const e=env32();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);const checked=checkAndAddDeclaration(e,ParamIndex);
  assert.deepEqual(checked.generated,['ParamIndexNIE32.leaf','ParamIndexNIE32.node','ParamIndexNIE32.rec','ParamIndexNIE32.rec_1']);
  const rec=e.get('ParamIndexNIE32.rec')?.declaration,helper=e.get('ParamIndexNIE32.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');
  assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.numIndices,1);assert.equal(helper.metadata.numParams,1);assert.equal(helper.metadata.numIndices,0);
  assert.match(pretty(helper.type),/ParamIndexNIE32/);
}

// Parameter expression succ p: prove linked helper -> indexed outer iota, not merely type shape.
const ParamExpr={kind:'inductive',name:'ParamExprNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'ParamExprNIE32.leaf',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Apps(C('ParamExprNIE32'),[B(1),B(0)])))},
  {name:'ParamExprNIE32.node',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(App(C('BoxNIE32'),Apps(C('ParamExprNIE32'),[B(1),App(C('succNIE32'),B(1))])),Apps(C('ParamExprNIE32'),[B(2),B(1)]))))},
]};
{
  const e=env32();for(const d of [Nat,zero,one,succ,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamExpr);
  const rec=e.get('ParamExprNIE32.rec')?.declaration,helper=e.get('ParamExprNIE32.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');assert.equal(rec.metadata.numParams,1);assert.equal(rec.metadata.numIndices,1);assert.equal(helper.metadata.numParams,1);assert.equal(helper.metadata.numIndices,0);
  const N={kind:'axiom',name:'ResultNIE32',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'result0NIE32',levelParams:[],type:C('ResultNIE32')};for(const d of [N,n0])checkAndAddDeclaration(e,d);
  const p=C('zeroNIE32'),i=C('oneNIE32'),fixed=App(C('succNIE32'),p),treeFixed=Apps(C('ParamExprNIE32'),[p,fixed]),boxFixed=App(C('BoxNIE32'),treeFixed);
  const mT=Lam(C('NatNIE32'),Lam(Apps(C('ParamExprNIE32'),[p,B(0)]),C('ResultNIE32'))),mB=Lam(boxFixed,C('ResultNIE32'));
  const leaf=Lam(C('NatNIE32'),C('result0NIE32'));
  const node=Lam(C('NatNIE32'),Lam(boxFixed,Lam(C('ResultNIE32'),B(0))));
  const boxMinor=Lam(treeFixed,Lam(C('ResultNIE32'),B(0)));
  const leafFixed=Apps(C('ParamExprNIE32.leaf'),[p,fixed]);
  const major=Apps(C('ParamExprNIE32.node'),[p,i,Apps(C('BoxNIE32.mk'),[treeFixed,leafFixed])]);
  const term=Apps(C('ParamExprNIE32.rec',[L1]),[p,mT,mB,leaf,node,boxMinor,i,major]);
  const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('result0NIE32')),`parameter-expression nested iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),C('ResultNIE32')));
}

// Two uniform parameters and a nontrivial fixed index expression add p q.
const TwoParams={kind:'inductive',name:'TwoParamsNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(C('NatNIE32'),S(L1)))),numParams:2,numIndices:1,constructors:[
  {name:'TwoParamsNIE32.leaf',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(C('NatNIE32'),Apps(C('TwoParamsNIE32'),[B(2),B(1),B(0)]))))},
  {name:'TwoParamsNIE32.node',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(App(C('BoxNIE32'),Apps(C('TwoParamsNIE32'),[B(2),B(1),Apps(C('addNIE32'),[B(2),B(1)])])),Apps(C('TwoParamsNIE32'),[B(3),B(2),B(1)])))))},
]};
{
  const e=env32();for(const d of [Nat,add,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,TwoParams);
  const rec=e.get('TwoParamsNIE32.rec')?.declaration,helper=e.get('TwoParamsNIE32.rec_1')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(helper?.kind,'recursor');assert.equal(rec.metadata.numParams,2);assert.equal(rec.metadata.numIndices,1);assert.equal(helper.metadata.numParams,2);assert.equal(helper.metadata.numIndices,0);
  assert.match(pretty(helper.type),/addNIE32/);
}

// A constructor-local transformed index remains forbidden; projection to the parameter context fails.
const Changed={kind:'inductive',name:'ChangedNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'ChangedNIE32.leaf',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Apps(C('ChangedNIE32'),[B(1),B(0)])))},
  {name:'ChangedNIE32.step',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(App(C('BoxNIE32'),Apps(C('ChangedNIE32'),[B(1),App(C('succNIE32'),B(0))])),Apps(C('ChangedNIE32'),[B(2),B(1)]))))},
]};
{
  const e=env32();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Changed),/parameter|uniform|corresponding|fixed|nested|positive/i);assert.equal(e.has('ChangedNIE32'),false);assert.equal(e.has('ChangedNIE32.rec'),false);assert.equal(e.has('ChangedNIE32.rec_1'),false);
}

// v32 retains v31 captured-current-index behavior.
const Captured={kind:'inductive',name:'CapturedNIE32',levelParams:[],type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'CapturedNIE32.leaf',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Apps(C('CapturedNIE32'),[B(1),B(0)])))},
  {name:'CapturedNIE32.node',type:Pi(C('NatNIE32'),Pi(C('NatNIE32'),Pi(App(C('BoxNIE32'),Apps(C('CapturedNIE32'),[B(1),B(0)])),Apps(C('CapturedNIE32'),[B(2),B(1)]))))},
]};
{
  const e=env32();for(const d of [Nat,Box])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,Captured);const rec=e.get('CapturedNIE32.rec')?.declaration;assert.equal(rec?.kind,'recursor');assert.equal(rec.metadata.numParams,2);assert.equal(rec.metadata.numIndices,0);
}

// Historical v31 must not acquire parameter-dependent fixed-index semantics.
{
  const e=env31();for(const d of [Nat,succ,Box])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,ParamExpr),/parameter|uniform|corresponding|fixed|nested|positive/i);assert.equal(e.has('ParamExprNIE32'),false);
}

// Strict v32 serialization/replay and v31 semantic-smuggling rejection.
{
  const declarations=[Nat,zero,one,succ,Box,ParamExpr];assert.equal(checkCoreDeclarations(declarations,'KERNEL-nested-index-expressions0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-nested-indices0'),/parameter|uniform|corresponding|fixed|nested|positive/i);
  const artifact=makeKernelNestedIndexExpressionsArtifact(declarations);assert.equal(artifact.formatVersion,32);assert.equal(artifact.implementationProfile,'KERNEL-nested-index-expressions0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  assert.throws(()=>decodeArtifact({...artifact,formatVersion:31}),/unsupported v31 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-indices0'}),/unsupported v32 implementation profile/);
  const historical=makeKernelNestedIndicesArtifact([Nat,zero,one,succ,Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/parameter|uniform|corresponding|fixed|nested|positive/i);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-index-expressions-v32-')),file=path.join(dir,'v32.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set(['NatNIE32','zeroNIE32','oneNIE32','succNIE32']));assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1: parameter-only fixed expressions accepted; constructor-local transformed index rejected.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nested-index-expressions-v32-lean-'));
  const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive ParamIndex (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → ParamIndex p i\n| node : (i : Nat) → Box (ParamIndex p p) → ParamIndex p i\n#print ParamIndex.rec\n#print ParamIndex.rec_1\n\ninductive ParamExpr (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → ParamExpr p i\n| node : (i : Nat) → Box (ParamExpr p (Nat.succ p)) → ParamExpr p i\n#print ParamExpr.rec\n#print ParamExpr.rec_1\n\ninductive TwoParams (p q : Nat) : Nat → Type where\n| leaf : (i : Nat) → TwoParams p q i\n| node : (i : Nat) → Box (TwoParams p q (p + q)) → TwoParams p q i\n#print TwoParams.rec\n#print TwoParams.rec_1\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/ParamIndex\.rec/);assert.match(gr.stdout,/Box \(ParamIndex p p\)/);assert.match(gr.stdout,/ParamExpr\.rec/);assert.match(gr.stdout,/ParamExpr p p\.succ/);assert.match(gr.stdout,/TwoParams\.rec/);assert.match(gr.stdout,/p \+ q/);
  const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where\n| mk : α → Box α\n\ninductive Changed (p : Nat) : Nat → Type where\n| leaf : (i : Nat) → Changed p i\n| step : (i : Nat) → Box (Changed p (Nat.succ i)) → Changed p i\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/nested inductive datatypes parameters cannot contain local variables/i);
  fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_NESTED_INDEX_EXPRESSIONS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-nested-index-expressions0',coreFormat:32,status:'accepted',supportedSlice:'v31 bounded indexed nested preprocessing extended with fixed index expressions over uniform outer parameters',observations:{parameterIndex:'accepted',parameterExpression:'accepted',twoParameterExpression:'accepted',linkedIndexedIota:'accepted',capturedIndexRegression:'accepted',changedConstructorLocalIndex:'rejected',serializedReplay:'accepted'},historicalIsolation:{v31ParameterDependentFixedIndex:'rejected'},explicitGaps:{indexedContainer:'unsupported',polymorphicOuterOrContainer:'unsupported',multipleNestedContainers:'unsupported',deeperNestedSpecializations:'unsupported',nestedProp:'unsupported',mixedCapturedAndClosedSpecializations:'unsupported'}},null,2)+'\n');
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v32 nested index expressions: parameter-only fixed indices, expression instantiation, linked indexed iota, rejection, replay, historical isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
