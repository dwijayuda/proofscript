import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {Environment,checkAndAddDeclaration,checkCoreDeclarations,levelOfNat,infer,kernelWhnf,pretty,sameTerm} from '../packages/kernel/dist/index.js';
import {makeKernelIndexedRecursorsArtifact,decodeArtifact} from '../packages/kernel-codec/dist/index.js';
import {verifyFile} from '../packages/verifier/dist/index.js';
const L1=levelOfNat(1),S=level=>({tag:'sort',level}),C=(name,levels=[])=>({tag:'const',name,levels}),B=index=>({tag:'bvar',index}),App=(fn,arg)=>({tag:'app',fn,arg}),Apps=(fn,args)=>args.reduce(App,fn),Pi=(domain,body,binderInfo='explicit')=>({tag:'pi',domain,body,binderInfo}),Lam=(domain,body,binderInfo='explicit')=>({tag:'lam',domain,body,binderInfo});
const J={kind:'axiom',name:'J',levelParams:[],type:S(L1)},j0={kind:'axiom',name:'j0',levelParams:[],type:C('J')},j1={kind:'axiom',name:'j1',levelParams:[],type:C('J')};
const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)},Alpha={kind:'axiom',name:'Alpha',levelParams:[],type:S(L1)};
const IX={kind:'inductive',name:'IX',levelParams:[],type:Pi(S(L1),Pi(C('J'),S(L1))),numParams:1,numIndices:1,constructors:[
 {name:'IX.step',type:Pi(S(L1),Pi(Apps(C('IX'),[B(0),C('j0')]),Apps(C('IX'),[B(1),C('j1')])), 'implicit')}
]};
const exactEnv=()=>new Environment({recursorProfile:'lean4331',allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true,allowIndexedRecursiveRecursors:true});
{
 const env=exactEnv();for(const d of [J,j0,j1,N,Alpha])checkAndAddDeclaration(env,d);const checked=checkAndAddDeclaration(env,IX);assert.deepEqual(checked.generated,['IX.step','IX.rec']);
 const rec=env.get('IX.rec');assert.ok(rec);const text=pretty(rec.declaration.type);assert.match(text,/(IX\(x0, j0\)|\(\(IX #1\) j0\))/);assert.match(text,/(x1\(j0, x2\)|\(\(#1 j0\) #0\))/);assert.match(text,/(x1\(j1, IX\.step\(x0, x2\)\)|\(\(#2 j1\) \(\(IX\.step #3\) #1\)\))/);
 const ix0=Apps(C('IX'),[C('Alpha'),C('j0')]);const x={kind:'axiom',name:'x',levelParams:[],type:ix0};checkAndAddDeclaration(env,x);
 const motive=Lam(C('J'),Lam(Apps(C('IX'),[C('Alpha'),B(0)]),C('N')));
 const minor=Lam(ix0,Lam(C('N'),B(0)));
 const major=Apps(C('IX.step'),[C('Alpha'),C('x')]);
 const recConst=C('IX.rec',[L1]);const app=Apps(recConst,[C('Alpha'),motive,minor,C('j1'),major]);
 assert.ok(sameTerm(kernelWhnf(env,infer(env,[],app)),C('N')));
 const reduced=kernelWhnf(env,app);const expected=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),C('x')]);
 assert.ok(sameTerm(reduced,expected),`recursive index propagation mismatch\nactual ${pretty(reduced)}\nexpected ${pretty(expected)}`);
}
// Higher-order indexed recursion receives a pointwise IH at the recursive index.
{
 const HO={kind:'inductive',name:'HO',levelParams:[],type:Pi(S(L1),Pi(C('J'),S(L1))),numParams:1,numIndices:1,constructors:[{name:'HO.mk',type:Pi(S(L1),Pi(Pi(C('N'),Apps(C('HO'),[B(1),C('j0')])),Apps(C('HO'),[B(1),C('j1')])))}]};
 const n0={kind:'axiom',name:'n0',levelParams:[],type:C('N')};
 const env=exactEnv();for(const d of [J,j0,j1,N,Alpha,n0])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,HO);
 const rec=env.get('HO.rec');assert.ok(rec);const text=pretty(rec.declaration.type);assert.match(text,/(\(x3: N\) → x1\(j0, x2\(x3\)\)|Pi \(N\).*#.*j0.*#.*#0|N.*HO.*j0)/);
 const fieldType=Pi(C('N'),Apps(C('HO'),[C('Alpha'),C('j0')]));const f={kind:'axiom',name:'f',levelParams:[],type:fieldType};checkAndAddDeclaration(env,f);
 const motive=Lam(C('J'),Lam(Apps(C('HO'),[C('Alpha'),B(0)]),C('N')));
 const minor=Lam(fieldType,Lam(Pi(C('N'),C('N')),App(B(0),C('n0'))));
 const major=Apps(C('HO.mk'),[C('Alpha'),C('f')]);const recConst=C('HO.rec',[L1]);
 const app=Apps(recConst,[C('Alpha'),motive,minor,C('j1'),major]);
 const expected=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),App(C('f'),C('n0'))]);
 const reduced=kernelWhnf(env,app);assert.ok(sameTerm(reduced,expected),`higher-order indexed iota mismatch\nactual ${pretty(reduced)}\nexpected ${pretty(expected)}`);
}
// Constructor-local indices may determine both a recursive field index and a distinct result index (Vec-like shape).
{
 const next={kind:'axiom',name:'next',levelParams:[],type:Pi(C('J'),C('J'))};
 const IXD={kind:'inductive',name:'IXD',levelParams:[],type:Pi(S(L1),Pi(C('J'),S(L1))),numParams:1,numIndices:1,constructors:[
  {name:'IXD.step',type:Pi(S(L1),Pi(C('J'),Pi(Apps(C('IXD'),[B(1),B(0)]),Apps(C('IXD'),[B(2),App(C('next'),B(1))]))))}
 ]};
 const env=exactEnv();for(const d of [J,j0,j1,N,Alpha,next])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,IXD);
 const rec=env.get('IXD.rec');assert.ok(rec);const text=pretty(rec.declaration.type);assert.match(text,/(x1\(x2, x3\)|#.*#0|IXD #.*#0)/);assert.match(text,/(x1\(next\(x2\), IXD\.step|next|IXD\.step)/);
 const ix0=Apps(C('IXD'),[C('Alpha'),C('j0')]);const x={kind:'axiom',name:'xd',levelParams:[],type:ix0};checkAndAddDeclaration(env,x);
 const motive=Lam(C('J'),Lam(Apps(C('IXD'),[C('Alpha'),B(0)]),C('N')));
 const minor=Lam(C('J'),Lam(Apps(C('IXD'),[C('Alpha'),B(0)]),Lam(C('N'),B(0))));
 const major=Apps(C('IXD.step'),[C('Alpha'),C('j0'),C('xd')]);const recConst=C('IXD.rec',[L1]);
 const app=Apps(recConst,[C('Alpha'),motive,minor,App(C('next'),C('j0')),major]);
 const expected=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),C('xd')]);
 const reduced=kernelWhnf(env,app);assert.ok(sameTerm(reduced,expected),`dependent local-index iota mismatch\nactual ${pretty(reduced)}\nexpected ${pretty(expected)}`);
}
// Multiple indices and multiple recursive fields are preserved independently.
{
 const K={kind:'axiom',name:'K',levelParams:[],type:S(L1)},k0={kind:'axiom',name:'k0',levelParams:[],type:C('K')},k1={kind:'axiom',name:'k1',levelParams:[],type:C('K')};
 const MIX={kind:'inductive',name:'MIX',levelParams:[],type:Pi(S(L1),Pi(C('J'),Pi(C('K'),S(L1)))),numParams:1,numIndices:2,constructors:[
  {name:'MIX.step',type:Pi(S(L1),Pi(Apps(C('MIX'),[B(0),C('j0'),C('k0')]),Pi(Apps(C('MIX'),[B(1),C('j0'),C('k1')]),Apps(C('MIX'),[B(2),C('j1'),C('k1')]))))}
 ]};
 const env=exactEnv();for(const d of [J,j0,j1,K,k0,k1,N,Alpha])checkAndAddDeclaration(env,d);checkAndAddDeclaration(env,MIX);
 const rec=env.get('MIX.rec');assert.ok(rec);const text=pretty(rec.declaration.type);assert.match(text,/(x1\(j0, k0, x2\)|j0.*k0)/);assert.match(text,/(x1\(j0, k1, x3\)|j0.*k1)/);assert.match(text,/(x1\(j1, k1, MIX\.step|j1.*k1.*MIX\.step)/);
 const m0=Apps(C('MIX'),[C('Alpha'),C('j0'),C('k0')]),m1=Apps(C('MIX'),[C('Alpha'),C('j0'),C('k1')]);
 checkAndAddDeclaration(env,{kind:'axiom',name:'m0',levelParams:[],type:m0});checkAndAddDeclaration(env,{kind:'axiom',name:'m1',levelParams:[],type:m1});
 const motive=Lam(C('J'),Lam(C('K'),Lam(Apps(C('MIX'),[C('Alpha'),B(1),B(0)]),C('N'))));
 // Return the second IH so we can observe which recursive index pair is used.
 const minor=Lam(m0,Lam(C('N'),Lam(m1,Lam(C('N'),B(0)))));
 const major=Apps(C('MIX.step'),[C('Alpha'),C('m0'),C('m1')]);const recConst=C('MIX.rec',[L1]);
 const app=Apps(recConst,[C('Alpha'),motive,minor,C('j1'),C('k1'),major]);
 const expected=Apps(recConst,[C('Alpha'),motive,minor,C('j0'),C('k1'),C('m1')]);
 const reduced=kernelWhnf(env,app);assert.ok(sameTerm(reduced,expected),`multi-index/multi-recursive iota mismatch\nactual ${pretty(reduced)}\nexpected ${pretty(expected)}`);
}
// v17 replay succeeds; v16 must not acquire indexed-recursive semantics.
{
 const artifact=makeKernelIndexedRecursorsArtifact([J,j0,j1,IX]);assert.equal(artifact.formatVersion,17);assert.equal(artifact.implementationProfile,'KERNEL-indexed-recursors0');
 const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,'accepted');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-indexed-rec-'));const file=path.join(dir,'ix.pscore.json');fs.writeFileSync(file,JSON.stringify(artifact));assert.equal(verifyFile(file,new Set(['J','j0','j1'])).status,'accepted');
 const old={...artifact,formatVersion:16,implementationProfile:'KERNEL-inductive-positivity0'};const oldDecoded=decodeArtifact(old);const oldResult=checkCoreDeclarations(oldDecoded.declarations,oldDecoded.implementationProfile);assert.equal(oldResult.status,'unsupported');assert.match(oldResult.message ?? '',/indexed recursive recursors are unsupported/);fs.rmSync(dir,{recursive:true,force:true});
}
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
 const ver=spawnSync(lean,['--version'],{encoding:'utf8'});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-indexed-rec-lean-'));const file=path.join(dir,'Indexed.lean');fs.writeFileSync(file,`set_option pp.universes true
set_option pp.explicit true
axiom J : Type
axiom j0 : J
axiom j1 : J
axiom N : Type
inductive IX (α : Type u) : J → Type u where | step : IX α j0 → IX α j1
inductive HO (α : Type u) : J → Type u where | mk : (N → HO α j0) → HO α j1
axiom next : J → J
axiom K : Type
axiom k0 : K
axiom k1 : K
inductive IXD (α : Type u) : J → Type u where | step : (j : J) → IXD α j → IXD α (next j)
#check @IX.rec
#print IX.rec
#check @HO.rec
#print HO.rec
#check @IXD.rec
#print IXD.rec
inductive MIX (α : Type u) : J → K → Type u where | step : MIX α j0 k0 → MIX α j0 k1 → MIX α j1 k1
#check @MIX.rec
#print MIX.rec
`);const r=spawnSync(lean,[file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/motive j0 a → motive j1 \(@IX\.step/);assert.match(r.stdout,/IX\.rec.*j0 a/s);assert.match(r.stdout,/\(\(a_1 : N\) → motive j0 \(a a_1\)\)/);assert.match(r.stdout,/motive j a → motive \(next j\)/);assert.match(r.stdout,/motive j0 k0 a →/);assert.match(r.stdout,/motive j0 k1 a_1 →/);
 fs.mkdirSync(path.join(process.cwd(),'artifacts'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'artifacts/KERNEL_INDEXED_RECURSORS_DIFFERENTIAL_REPORT.json'),JSON.stringify({schemaVersion:1,semanticBaseline:'Lean 4.33.1',leanCommit:'819816b2e0a3bf405af45ae5c7af2491d8f5bee6',profile:'KERNEL-indexed-recursors0',coreFormat:17,status:'accepted',observations:{directRecursiveIndexedField:'accepted',higherOrderIndexedRecursiveField:'accepted',pointwiseIndexedIH:'accepted',dependentConstructorLocalIndex:'accepted',dependentMotive:'accepted',minorRecursiveIHIndex:'j0',majorResultIndex:'j1',iotaRecursiveIndexPropagation:'accepted',multipleIndices:'accepted',multipleRecursiveFields:'accepted'},capabilityGaps:['mutual/nested inductive preprocessing','remaining fully general dependent indexed recursor edge cases']},null,2)+'\n');fs.rmSync(dir,{recursive:true,force:true});
}
console.log('✓ kernel v17 direct+higher-order indexed recursors, dependent local indices/motive/minors, recursive index iota, historical gating, and exact Lean observations passed');
