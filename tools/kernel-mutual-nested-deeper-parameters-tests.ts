import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,infer,kernelWhnf,levelOfNat,sameTerm,pretty} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelMutualNestedDeeperParametersArtifact,makeKernelMutualNestedDeeperArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const base={recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowNestedInductives:true,allowNestedParameters:true,allowNestedIndices:true,allowNestedIndexExpressions:true,allowNestedMultipleSpecializations:true,allowNestedPolymorphic:true,allowNestedIndexedContainers:true,allowLeanRecursorMinorOrder:true,allowNestedDeeper:true,allowNestedDeeperGeneralization:true,allowNestedDeeperParameters:true,allowNestedDeeperIndices:true,allowNestedDeeperPolymorphic:true,allowNestedDeeperMultipleFields:true,allowNestedDeeperProp:true,allowNestedDeeperMultiParameter:true,allowNestedDeeperMultiParameterGeneralization:true,allowNestedDeeperDependentContainerParameters:true,allowUniformParameterDefEq:true,allowRecursorFamilyBinderInfo:true,allowMutualNestedGeneralization:true,allowMutualNestedParameters:true,allowMutualNestedIndices:true,allowMutualNestedPolymorphic:true,allowMutualNestedProp:true,allowMutualNestedIndexedContainers:true,allowMutualNestedDeeper:true};
const env56=()=>new Environment(base),env57=()=>new Environment({...base,allowMutualNestedDeeperParameters:true});

const Box={kind:'inductive',name:'BoxMN57',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BoxMN57.mk',type:Pi(S(L1),Pi(B(0),App(C('BoxMN57'),B(1))))}]};
const ParamDeep={kind:'mutualInductive',name:'ParamDeepMN57',levelParams:[],inductives:[
 {name:'AMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
   {name:'AMN57.leaf',type:Pi(S(L1),App(C('AMN57'),B(0)))},
   {name:'AMN57.step',type:Pi(S(L1),Pi(App(C('BoxMN57'),App(C('BoxMN57'),App(C('BMN57'),B(0)))),App(C('AMN57'),B(1))))},
 ]},
 {name:'BMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BMN57.back',type:Pi(S(L1),Pi(App(C('AMN57'),B(0)),App(C('BMN57'),B(1))))}]},
]};

// v57 adds two deep helpers while preserving the exact shared parameter telescope.
{
 const old=env56();checkAndAddDeclaration(old,Box);assert.throws(()=>checkAndAddDeclaration(old,ParamDeep),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const e=env57();checkAndAddDeclaration(e,Box);const checked=checkAndAddDeclaration(e,ParamDeep);
 for(const n of ['AMN57.rec','BMN57.rec','AMN57.rec_1','AMN57.rec_2'])assert.ok(e.has(n),`missing ${n}`);assert.equal(e.has('AMN57.rec_3'),false);
 const r=e.get('AMN57.rec').declaration,h1=e.get('AMN57.rec_1').declaration,h2=e.get('AMN57.rec_2').declaration;for(const x of [r,h1,h2])assert.equal(x.kind,'recursor');
 assert.equal(r.metadata.numParams,1);assert.equal(r.metadata.mutual.motiveCount,4);assert.deepEqual(r.metadata.mutual.recursors,['AMN57.rec','BMN57.rec','AMN57.rec_1','AMN57.rec_2']);
 assert.match(pretty(r.type),/BoxMN57\(BoxMN57\(BMN57\(x0\)\)\)/);assert.match(pretty(h2.type),/BoxMN57\(BMN57\(x0\)\)/);
 assert.deepEqual(checked.generated,['AMN57.leaf','AMN57.step','BMN57.back','AMN57.rec','BMN57.rec','AMN57.rec_1','AMN57.rec_2']);
}

// Actual parameter-carrying deep iota: A.step -> helper1 -> helper2 -> B.back -> A.leaf.
{
 const Alpha={kind:'axiom',name:'AlphaMN57',levelParams:[],type:S(L1)},Out={kind:'axiom',name:'OutMN57',levelParams:[],type:S(L1)},out0={kind:'axiom',name:'out0MN57',levelParams:[],type:C('OutMN57')};
 const e=env57();for(const d of [Box,Alpha,Out,out0])checkAndAddDeclaration(e,d);checkAndAddDeclaration(e,ParamDeep);
 const a=C('AlphaMN57'),aTy=App(C('AMN57'),a),bTy=App(C('BMN57'),a),boxB=App(C('BoxMN57'),bTy),boxboxB=App(C('BoxMN57'),boxB),out=C('OutMN57');
 const args=[a,Lam(aTy,out),Lam(bTy,out),Lam(boxboxB,out),Lam(boxB,out),C('out0MN57'),Lam(boxboxB,Lam(out,B(0))),Lam(aTy,Lam(out,B(0))),Lam(boxB,Lam(out,B(0))),Lam(bTy,Lam(out,B(0)))];
 const major=Apps(C('AMN57.step'),[a,Apps(C('BoxMN57.mk'),[boxB,Apps(C('BoxMN57.mk'),[bTy,Apps(C('BMN57.back'),[a,App(C('AMN57.leaf'),a)])])])]);
 const term=Apps(C('AMN57.rec',[L1]),[...args,major]);const reduced=kernelWhnf(e,term);assert.ok(sameTerm(reduced,C('out0MN57')),`v57 linked iota mismatch: ${pretty(reduced)}`);assert.ok(sameTerm(kernelWhnf(e,infer(e,[],term)),out));
}

// Genuinely dependent shared parameters: (α : Type) (x : α).
const DepDeep={kind:'mutualInductive',name:'DepDeepMN57',levelParams:[],inductives:[
 {name:'DAMN57',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[
  {name:'DAMN57.leaf',type:Pi(S(L1),Pi(B(0),Apps(C('DAMN57'),[B(1),B(0)])))},
  {name:'DAMN57.step',type:Pi(S(L1),Pi(B(0),Pi(App(C('BoxMN57'),App(C('BoxMN57'),Apps(C('DBMN57'),[B(1),B(0)]))),Apps(C('DAMN57'),[B(2),B(1)]))))},
 ]},
 {name:'DBMN57',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[{name:'DBMN57.back',type:Pi(S(L1),Pi(B(0),Pi(Apps(C('DAMN57'),[B(1),B(0)]),Apps(C('DBMN57'),[B(2),B(1)]))))}]},
]};
{
 const e=env57();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,DepDeep);const r=e.get('DAMN57.rec').declaration;assert.equal(r.kind,'recursor');assert.equal(r.metadata.numParams,2);assert.equal(r.metadata.mutual.motiveCount,4);assert.ok(e.has('DAMN57.rec_1'));assert.ok(e.has('DAMN57.rec_2'));const t=pretty(r.type);assert.match(t,/\{x0: Type\}/);assert.match(t,/\{x1: x0\}/);assert.match(t,/BoxMN57\(BoxMN57\(DBMN57\(x0, x1\)\)\)/);
}

// Depth three still generates one helper per public layer under the shared parameter prefix.
{
 const D3={kind:'mutualInductive',name:'D3MN57',levelParams:[],inductives:[
  {name:'D3AMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'D3AMN57.step',type:Pi(S(L1),Pi(App(C('BoxMN57'),App(C('BoxMN57'),App(C('BoxMN57'),App(C('D3BMN57'),B(0))))),App(C('D3AMN57'),B(1))))}]},
  {name:'D3BMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'D3BMN57.back',type:Pi(S(L1),Pi(App(C('D3AMN57'),B(0)),App(C('D3BMN57'),B(1))))}]},
 ]};
 const e=env57();checkAndAddDeclaration(e,Box);checkAndAddDeclaration(e,D3);assert.equal(e.get('D3AMN57.rec').declaration.metadata.mutual.motiveCount,5);for(const n of ['D3AMN57.rec_1','D3AMN57.rec_2','D3AMN57.rec_3'])assert.ok(e.has(n));
}

// Non-uniform deep target parameters and constructor-local capture are rejected atomically.
{
 const Nat={kind:'axiom',name:'NatMN57',levelParams:[],type:S(L1)};
 const Bad={kind:'mutualInductive',name:'BadMN57',levelParams:[],inductives:[
  {name:'BadAMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BadAMN57.mk',type:Pi(S(L1),Pi(App(C('BoxMN57'),App(C('BoxMN57'),App(C('BadBMN57'),C('NatMN57')))),App(C('BadAMN57'),B(1))))}]},
  {name:'BadBMN57',type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BadBMN57.mk',type:Pi(S(L1),App(C('BadBMN57'),B(0)))}]},
 ]};
 const e=env57();for(const d of [Box,Nat])checkAndAddDeclaration(e,d);assert.throws(()=>checkAndAddDeclaration(e,Bad),/parameter|uniform|definitionally equal|positive mutual occurrence|nested/i);assert.equal(e.has('BadAMN57'),false);
}
{
 // Universe-valid locality probe: (N : Type) (x : N) are shared parameters,
 // while constructor-local n : N is illegally used as B's fixed second parameter.
 const Local={kind:'mutualInductive',name:'LocalMN57',levelParams:[],inductives:[
  {name:'LAMN57',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[{name:'LAMN57.mk',type:Pi(S(L1),Pi(B(0),Pi(B(1),Pi(App(C('BoxMN57'),App(C('BoxMN57'),Apps(C('LBMN57'),[B(2),B(0)]))),Apps(C('LAMN57'),[B(3),B(2)])))))}]},
  {name:'LBMN57',type:Pi(S(L1),Pi(B(0),S(L1))),numParams:2,numIndices:0,constructors:[{name:'LBMN57.mk',type:Pi(S(L1),Pi(B(0),Apps(C('LBMN57'),[B(1),B(0)])))}]},
 ]};
 const e=env57();checkAndAddDeclaration(e,Box);assert.throws(()=>checkAndAddDeclaration(e,Local),/parameter|local|definitionally equal|uniform|recursive occurrence|nested/i);assert.equal(e.has('LAMN57'),false);
}

// Strict Core v57 replay and frozen v56 isolation.
{
 const declarations=[Box,ParamDeep];assert.equal(checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper-parameters0').status,'accepted');assert.throws(()=>checkCoreDeclarations(declarations,'KERNEL-mutual-nested-deeper0'),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const artifact=makeKernelMutualNestedDeeperParametersArtifact(declarations);assert.equal(artifact.formatVersion,57);assert.equal(artifact.implementationProfile,'KERNEL-mutual-nested-deeper-parameters0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:56}),/unsupported v56 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-mutual-nested-deeper0'}),/unsupported v57 implementation profile/);
 const historical=makeKernelMutualNestedDeeperArtifact([Box]);const smuggled=decodeArtifact({...historical,declarations});assert.throws(()=>checkCoreDeclarations(smuggled.declarations,smuggled.implementationProfile),/positive mutual occurrence|mutual recursion|nested|constructor field|positive/i);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-param-v57-')),file=path.join(dir,'v57.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-mutual-nested-deeper-param-v57-lean-'));
 const good=path.join(dir,'Good.lean');fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ninductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A (α : Type) : Type where | leaf : A α | step : Box (Box (B α)) → A α\n  inductive B (α : Type) : Type where | back : A α → B α\nend\n#print A.rec\n#print A.rec_1\n#print A.rec_2\nmutual\n  inductive DA (α : Type) (x : α) : Type where | leaf : DA α x | step : Box (Box (DB α x)) → DA α x\n  inductive DB (α : Type) (x : α) : Type where | back : DA α x → DB α x\nend\n#print DA.rec\n#check DA.rec_1\n#check DA.rec_2\nmutual\n  inductive D3A (α : Type) : Type where | step : Box (Box (Box (D3B α))) → D3A α\n  inductive D3B (α : Type) : Type where | back : D3A α → D3B α\nend\n#print D3A.rec\n#check D3A.rec_3\n`);const gr=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(gr.status,0,gr.stderr||gr.stdout);assert.match(gr.stdout,/number of motives: 4/);assert.match(gr.stdout,/motive_3 : Box \(Box \(B α\)\) → Sort/);assert.match(gr.stdout,/motive_4 : Box \(B α\) → Sort/);assert.match(gr.stdout,/\{x : α\}/);assert.match(gr.stdout,/DA\.rec_2/);assert.match(gr.stdout,/number of motives: 5/);assert.match(gr.stdout,/D3A\.rec_3/);
 const bad=path.join(dir,'Bad.lean');fs.writeFileSync(bad,`inductive Box (α : Type) : Type where | mk : α → Box α\nmutual\n  inductive A (α : Type) : Type where | bad : Box (Box (B Nat)) → A α\n  inductive B (α : Type) : Type where | mk : B α\nend\n`);const br=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(br.status,0);assert.match(br.stderr+br.stdout,/Mismatched inductive type parameter|not definitionally equal|parameter/i);
 const badLocal=path.join(dir,'BadLocalValue.lean');fs.writeFileSync(badLocal,`inductive Box (α : Type) : Type where | mk : α → Box α
mutual
  inductive LA (N : Type) (x : N) : Type where
    | mk (n : N) : Box (Box (LB N n)) → LA N x
  inductive LB (N : Type) (x : N) : Type where
    | mk : LB N x
end
`);const bl=spawnSync(lean,[badLocal],{encoding:'utf8'});assert.notEqual(bl.status,0);assert.match(bl.stderr+bl.stdout,/Mismatched inductive type parameter|not definitionally equal|fixed throughout|parameter/i);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_MUTUAL_NESTED_DEEPER_PARAMETERS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-mutual-nested-deeper-parameters0',coreFormat:57,status:'accepted',supportedSlice:'monomorphic Type mutual blocks with shared/dependent uniform parameters, zero outer indices, and exactly one linear deep nested path of arbitrary finite depth >=2 through monomorphic one-parameter zero-index containers',observations:{depth2SharedParameter:'accepted',dependentSharedParameters:'accepted',fourMotiveOrder:'accepted',linkedParameterizedDeepIota:'accepted',depth3Parameterized:'accepted',nonUniformDeepTarget:'rejected',constructorLocalCapture:'rejected',serializedReplay:'accepted'},historicalIsolation:{v56ParameterizedDeepMutualNested:'rejected'},explicitGaps:{outerIndices:'unsupported',polymorphicDeepMutualNested:'unsupported',deepMutualNestedPropWithParameters:'unsupported',multipleDeepFields:'unsupported',indexedOrDependentDeepContainers:'unsupported'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log(`✓ kernel v57 parameterized arbitrary-depth mutual+nested helper chains, dependent shared parameters, linked iota, uniformity/locality rejection, replay, v56 isolation, and exact Lean observations passed${lean?' with exact Lean differential':' (exact Lean binary unavailable: differential pending)'}`);
