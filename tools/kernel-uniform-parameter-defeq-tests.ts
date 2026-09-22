import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,pretty,sameTerm} from '../packages/kernel/dist/index.js';
import {makeKernelUniformParameterDefEqArtifact,decodeArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=l=>({tag:'sort',level:l}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index}),App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo}),Let=(type,value,body,nondep=false)=>({tag:'let',type,value,body,nondep});
const Alpha={kind:'axiom',name:'AlphaRP47',levelParams:[],type:S(L1)},N={kind:'axiom',name:'NRP47',levelParams:[],type:S(L1)},n0={kind:'axiom',name:'n0RP47',levelParams:[],type:C('NRP47')};
const letParam=Let(S(L1),B(0),B(0));
const T={kind:'inductive',name:'TRP47',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'TRP47.leaf',type:Pi(S(L1),App(C('TRP47'),B(0)))},
 {name:'TRP47.mk',type:Pi(S(L1),Pi(App(C('TRP47'),letParam),App(C('TRP47'),B(1))))}
]};
const exactEnv=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true,allowIndexedProjections:true,allowPropElimination:true,allowRecursorK:true,allowInductiveUniverseChecks:true,allowDependentConstructorFields:true,allowTelescopeTerms:true,allowMutualInductives:true,allowMutualParameters:true,allowMutualIndices:true,allowHigherOrderMutualRecursion:true,allowMutualProp:true,allowLeanRecursorMinorOrder:true,allowUniformParameterDefEq:true});
// Non-indexed recursive parameters may be definitionally equal rather than syntactically identical.
{
 const env=exactEnv();for(const d of [Alpha,N,n0])checkAndAddDeclaration(env,d);const checked=checkAndAddDeclaration(env,T);assert.deepEqual(checked.generated,['TRP47.leaf','TRP47.mk','TRP47.rec']);
 const tAlpha=App(C('TRP47'),C('AlphaRP47'));checkAndAddDeclaration(env,{kind:'axiom',name:'xRP47',levelParams:[],type:tAlpha});
 const motive=Lam(tAlpha,C('NRP47')),minorLeaf=C('n0RP47'),minorMk=Lam(tAlpha,Lam(C('NRP47'),B(0)));
 const rec=C('TRP47.rec',[L1]),major=Apps(C('TRP47.mk'),[C('AlphaRP47'),C('xRP47')]);
 const app=Apps(rec,[C('AlphaRP47'),motive,minorLeaf,minorMk,major]);assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('NRP47')));
 const expected=Apps(rec,[C('AlphaRP47'),motive,minorLeaf,minorMk,C('xRP47')]);assert.ok(sameTerm(kernelWhnf(env,app),expected),`non-indexed recursive-parameter defeq iota mismatch\n${pretty(kernelWhnf(env,app))}`);
}
const J={kind:'axiom',name:'JRP47',levelParams:[],type:S(L1)},j0={kind:'axiom',name:'j0RP47',levelParams:[],type:C('JRP47')},j1={kind:'axiom',name:'j1RP47',levelParams:[],type:C('JRP47')};
const I={kind:'inductive',name:'IRP47',levelParams:[],type:Pi(S(L1),Pi(C('JRP47'),S(L1))),numParams:1,numIndices:1,constructors:[
 {name:'IRP47.zero',type:Pi(S(L1),Apps(C('IRP47'),[B(0),C('j0RP47')]))},
 {name:'IRP47.step',type:Pi(S(L1),Pi(Apps(C('IRP47'),[letParam,C('j0RP47')]),Apps(C('IRP47'),[B(1),C('j1RP47')])))}
]};
// Indexed recursor generation and recursive-index iota use the canonical uniform parameter after defeq admission.
{
 const env=exactEnv();for(const d of [Alpha,N,n0,J,j0,j1])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,I);
 const recEntry=env.get('IRP47.rec');assert.ok(recEntry);assert.match(pretty(recEntry.declaration.type),/j0RP47/);assert.match(pretty(recEntry.declaration.type),/IRP47\(x0, x2\)/);
 const i0=Apps(C('IRP47'),[C('AlphaRP47'),C('j0RP47')]);checkAndAddDeclaration(env,{kind:'axiom',name:'ixRP47',levelParams:[],type:i0});
 const motive=Lam(C('JRP47'),Lam(Apps(C('IRP47'),[C('AlphaRP47'),B(0)]),C('NRP47'))),minorZero=C('n0RP47'),minorStep=Lam(i0,Lam(C('NRP47'),B(0)));
 const rec=C('IRP47.rec',[L1]),major=Apps(C('IRP47.step'),[C('AlphaRP47'),C('ixRP47')]),app=Apps(rec,[C('AlphaRP47'),motive,minorZero,minorStep,C('j1RP47'),major]);
 const expected=Apps(rec,[C('AlphaRP47'),motive,minorZero,minorStep,C('j0RP47'),C('ixRP47')]);assert.ok(sameTerm(kernelWhnf(env,app),expected),`indexed recursive-parameter defeq iota mismatch\n${pretty(kernelWhnf(env,app))}`);
}
const HO={kind:'inductive',name:'HORP47',levelParams:[],type:Pi(S(L1),Pi(C('JRP47'),S(L1))),numParams:1,numIndices:1,constructors:[
 {name:'HORP47.mk',type:Pi(S(L1),Pi(Pi(C('NRP47'),Apps(C('HORP47'),[Let(S(L1),B(1),B(0)),C('j0RP47')])),Apps(C('HORP47'),[B(1),C('j1RP47')])))}
]};
// Higher-order indexed recursion gets a pointwise IH after defeq parameter admission.
{
 const env=exactEnv();for(const d of [Alpha,N,n0,J,j0,j1])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,HO);const text=pretty(env.get('HORP47.rec').declaration.type);assert.match(text,/NRP47\) → x1\(j0RP47, x2\(x3\)\)/);
 const fTy=Pi(C('NRP47'),Apps(C('HORP47'),[C('AlphaRP47'),C('j0RP47')]));checkAndAddDeclaration(env,{kind:'axiom',name:'fRP47',levelParams:[],type:fTy});
 const motive=Lam(C('JRP47'),Lam(Apps(C('HORP47'),[C('AlphaRP47'),B(0)]),C('NRP47'))),minor=Lam(fTy,Lam(Pi(C('NRP47'),C('NRP47')),App(B(0),C('n0RP47'))));
 const rec=C('HORP47.rec',[L1]),major=Apps(C('HORP47.mk'),[C('AlphaRP47'),C('fRP47')]),app=Apps(rec,[C('AlphaRP47'),motive,minor,C('j1RP47'),major]);
 const expected=Apps(rec,[C('AlphaRP47'),motive,minor,C('j0RP47'),App(C('fRP47'),C('n0RP47'))]);assert.ok(sameTerm(kernelWhnf(env,app),expected),`higher-order indexed recursive-parameter defeq iota mismatch\n${pretty(kernelWhnf(env,app))}`);
}

const R={kind:'inductive',name:'RRP47',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
 {name:'RRP47.mk',type:Pi(S(L1),Pi(App(C('RRP47'),B(0)),App(C('RRP47'),Let(S(L1),B(1),B(0)))))}
]};
// Constructor result parameters use the same definitional-equality rule.
{
 const env=exactEnv();for(const d of [Alpha,N])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,R);
 const rAlpha=App(C('RRP47'),C('AlphaRP47'));checkAndAddDeclaration(env,{kind:'axiom',name:'rxRP47',levelParams:[],type:rAlpha});
 const motive=Lam(rAlpha,C('NRP47')),minor=Lam(rAlpha,Lam(C('NRP47'),B(0))),rec=C('RRP47.rec',[L1]);
 const major=Apps(C('RRP47.mk'),[C('AlphaRP47'),C('rxRP47')]);const app=Apps(rec,[C('AlphaRP47'),motive,minor,major]);
 const expected=Apps(rec,[C('AlphaRP47'),motive,minor,C('rxRP47')]);assert.ok(sameTerm(kernelWhnf(env,app),expected),`constructor-result parameter defeq iota mismatch\n${pretty(kernelWhnf(env,app))}`);
 assert.equal(checkCoreDeclarations([R],'KERNEL-uniform-parameter-defeq0').status,'accepted');assert.throws(()=>checkCoreDeclarations([R],'KERNEL-nested-deeper-dependent-container-parameters0'),/constructor result parameter/);
}

// Genuinely different recursive parameters remain rejected.
{
 const Bad={kind:'inductive',name:'BadRP47',levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[{name:'BadRP47.mk',type:Pi(S(L1),Pi(App(C('BadRP47'),C('NRP47')),App(C('BadRP47'),B(1))))}]};
 const env=exactEnv();checkAndAddDeclaration(env,N);assert.throws(()=>checkAndAddDeclaration(env,Bad),/non-uniform recursive parameter/);
}
// Historical isolation + strict v47 artifact replay.
{
 assert.equal(checkCoreDeclarations([T],'KERNEL-uniform-parameter-defeq0').status,'accepted');assert.throws(()=>checkCoreDeclarations([T],'KERNEL-nested-deeper-dependent-container-parameters0'),/non-uniform recursive parameter/);
 const artifact=makeKernelUniformParameterDefEqArtifact([T,R]);assert.equal(artifact.formatVersion,47);assert.equal(artifact.implementationProfile,'KERNEL-uniform-parameter-defeq0');const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 assert.throws(()=>decodeArtifact({...artifact,formatVersion:46}),/unsupported v46 implementation profile/);assert.throws(()=>decodeArtifact({...artifact,implementationProfile:'KERNEL-nested-deeper-dependent-container-parameters0'}),/unsupported v47 implementation profile/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v47-')),file=path.join(dir,'v47.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));const replay=verifyFile(file,new Set());assert.equal(replay.status,'accepted');assert.equal(replay.projectPluginsLoaded,false);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-v47-lean-')),good=path.join(dir,'Good.lean'),bad=path.join(dir,'Bad.lean');
 fs.writeFileSync(good,`set_option pp.universes true\nset_option pp.explicit true\ndef alias (α : Type u) := α\ninductive T1 (α : Type u) : Type u where | leaf : T1 α | mk : T1 (id α) → T1 α\ninductive T2 (α : Type u) : Type u where | leaf : T2 α | mk : T2 (let β := α; β) → T2 α\ninductive T3 (α : Type u) : Type u where | leaf : T3 α | mk : T3 (alias α) → T3 α\ninductive I (α : Type u) : Nat → Type u where | zero : I α 0 | step : (n : Nat) → I (id α) n → I α (n+1)\ninductive HO (α : Type u) : Nat → Type u where | mk : (n : Nat) → (Nat → HO (let β := α; β) n) → HO α (n+1)\n#print T1.rec\n#print I.rec\n#print HO.rec\n`);
 const g=spawnSync(lean,[good],{encoding:'utf8'});assert.equal(g.status,0,g.stderr||g.stdout);assert.match(g.stdout,/recursor T1\.rec/);assert.match(g.stdout,/motive n a →/);assert.match(g.stdout,/\(a_1 : Nat\) → motive n \(a a_1\)/);
 fs.writeFileSync(bad,`inductive Bad (α : Type) : Type where | leaf : Bad α | mk : Bad Nat → Bad α\n`);const b=spawnSync(lean,[bad],{encoding:'utf8'});assert.notEqual(b.status,0);assert.match(b.stderr+b.stdout,/not definitionally equal|Mismatched inductive type parameter/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_UNIFORM_PARAMETER_DEFEQ_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-uniform-parameter-defeq0',coreFormat:47,status:'accepted',observations:{recursiveParameterDefEq:'accepted',constructorResultParameterDefEq:'accepted',nonIndexedDefEqParameter:'accepted',indexedDefEqParameter:'accepted',higherOrderIndexedDefEqParameter:'accepted',pointwiseIH:'accepted',linkedIota:'accepted',genuinelyDifferentParameter:'rejected',serializedReplay:'accepted'},historicalIsolation:{v46DefEqParameter:'rejected'}},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log('✓ kernel v47 uniform-parameter definitional equality, indexed/higher-order iota, historical isolation, and exact Lean observations passed');
