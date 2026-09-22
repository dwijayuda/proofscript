import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,defEq,infer,kernelWhnf,levelOfNat,sameTerm} from '../packages/kernel/dist/index.js';
import {decodeArtifact,makeKernelIndexedProjectionsArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';

const L0=levelOfNat(0),L1=levelOfNat(1),L2=levelOfNat(2);
const S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index});
const App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo});
const P=(typeName,index,expr)=>({tag:'proj',typeName,index,expr});
const D=(name,type,value)=>({kind:'definition',name,levelParams:[],type,value,reducibility:'regular'});
const exactEnv=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true});

const J={kind:'axiom',name:'J',levelParams:[],type:S(L1)},j0={kind:'axiom',name:'j0',levelParams:[],type:C('J')};
const A={kind:'axiom',name:'A',levelParams:[],type:S(L1)},a={kind:'axiom',name:'a',levelParams:[],type:C('A')};
const Dep={kind:'inductive',name:'Dep',levelParams:[],type:Pi(C('J'),S(L1)),numParams:0,numIndices:1,constructors:[
  {name:'Dep.mk',type:Pi(C('J'),Pi(C('A'),App(C('Dep'),B(1))))}
]};

// Indexed major, field inference and iota.
{
  const env=exactEnv();for(const d of [J,j0,A,a,Dep])checkAndAddDeclaration(env,d);
  const major=Apps(C('Dep.mk'),[C('j0'),C('a')]);
  assert.ok(sameTerm(infer(env,[],P('Dep',0,major)),C('J')));
  assert.ok(sameTerm(infer(env,[],P('Dep',1,major)),C('A')));
  assert.ok(sameTerm(kernelWhnf(env,P('Dep',0,major)),C('j0')));
  assert.ok(sameTerm(kernelWhnf(env,P('Dep',1,major)),C('a')));
}

// A dependent later field is reconstructed using the earlier raw projection.
{
  const F={kind:'axiom',name:'F',levelParams:[],type:Pi(C('J'),S(L1))};
  const DepD={kind:'inductive',name:'DepD',levelParams:[],type:Pi(C('J'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'DepD.mk',type:Pi(C('J'),Pi(App(C('F'),B(0)),App(C('DepD'),B(1))))}
  ]};
  const env=exactEnv();for(const d of [J,j0,F,DepD])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:'axiom',name:'dd',levelParams:[],type:App(C('DepD'),C('j0'))});
  const first=P('DepD',0,C('dd')), second=P('DepD',1,C('dd'));
  assert.ok(sameTerm(infer(env,[],second),App(C('F'),first)));
}

// Recursive indexed one-constructor families retain projection typing.
{
  const RecI={kind:'inductive',name:'RecI',levelParams:[],type:Pi(C('J'),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:'RecI.mk',type:Pi(C('J'),Pi(App(C('RecI'),B(0)),App(C('RecI'),B(1))))}
  ]};
  const env=exactEnv();for(const d of [J,j0,RecI])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:'axiom',name:'ri',levelParams:[],type:App(C('RecI'),C('j0'))});
  assert.ok(sameTerm(infer(env,[],P('RecI',1,C('ri'))),App(C('RecI'),P('RecI',0,C('ri')))));
}

// Prop projection safety: data projection is rejected, but a later proof field
// depending on that data projection remains legal.
{
  const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0',levelParams:[],type:C('N')};
  const predTy=Pi(C('N'),S(L0));
  const Pred={kind:'axiom',name:'Pred',levelParams:[],type:predTy};
  const h0={kind:'axiom',name:'h0',levelParams:[],type:App(C('Pred'),C('n0'))};
  const Witness={kind:'inductive',name:'Witness',levelParams:[],type:Pi(predTy,S(L0)),numParams:1,numIndices:0,constructors:[
    {name:'Witness.mk',type:Pi(predTy,Pi(C('N'),Pi(App(B(1),B(0)),App(C('Witness'),B(2)))))}
  ]};
  const env=exactEnv();for(const d of [N,n0,Pred,h0,Witness])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:'axiom',name:'w',levelParams:[],type:App(C('Witness'),C('Pred'))});
  assert.throws(()=>infer(env,[],P('Witness',0,C('w'))),/data-valued|non-proposition field/);
  const proofProjection=P('Witness',1,C('w'));
  assert.ok(sameTerm(infer(env,[],proofProjection),App(C('Pred'),P('Witness',0,C('w')))));
  const built=Apps(C('Witness.mk'),[C('Pred'),C('n0'),C('h0')]);
  assert.ok(sameTerm(kernelWhnf(env,P('Witness',1,built)),C('h0')));
}

// v18 conversion hardening: eta's type guard must not recursively invoke eta.
{
  const env=exactEnv();
  assert.equal(defEq(env,[],S(L1),S(L2)),false);
}

// Malformed projection targets fail closed.
{
  const Multi={kind:'inductive',name:'Multi',levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:'Multi.a',type:C('Multi')},{name:'Multi.b',type:C('Multi')}]};
  const env=exactEnv();for(const d of [J,j0,A,a,Dep,Multi])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:'axiom',name:'p',levelParams:[],type:App(C('Dep'),C('j0'))});
  assert.throws(()=>infer(env,[],P('Missing',0,C('p'))),/unknown or non-inductive|not an inductive/);
  assert.throws(()=>infer(env,[],P('Dep',9,C('p'))),/invalid projection index|out of range/);
  assert.throws(()=>infer(env,[],P('Dep',0,C('a'))),/expected Dep|not Dep/);
  assert.throws(()=>infer(env,[],P('Multi',0,C('p'))),/exactly one constructor|non-structure family/);
}

// Serialized v18 replay succeeds, while v17 cannot acquire indexed projection semantics.
{
  const p={kind:'axiom',name:'p',levelParams:[],type:App(C('Dep'),C('j0'))};
  const getJ=D('getJ',C('J'),P('Dep',0,C('p')));
  const artifact=makeKernelIndexedProjectionsArtifact([J,j0,A,Dep,p,getJ]);
  assert.equal(artifact.formatVersion,18);assert.equal(artifact.implementationProfile,'KERNEL-indexed-projections0');
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-indexed-proj-'));const file=path.join(dir,'p.pscore.json');
  fs.writeFileSync(file,JSON.stringify(artifact));assert.equal(verifyFile(file,new Set(['J','j0','A','p'])).status,'accepted');
  const old={...artifact,formatVersion:17,implementationProfile:'KERNEL-indexed-recursors0'};
  const oldDecoded=decodeArtifact(old);
  const oldSummary=checkCoreDeclarations(oldDecoded.declarations,oldDecoded.implementationProfile);
  assert.equal(oldSummary.status,'unsupported');
  assert.match(oldSummary.message??'',/indexed projections are unsupported/);
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log('✓ kernel v18 indexed projections, dependent fields, Prop safety, eta recursion hardening, malformed terms, replay, and historical gating passed');
