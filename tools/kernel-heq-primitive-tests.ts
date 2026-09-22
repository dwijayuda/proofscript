import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  Environment, checkAndAddDeclaration, installCorePrimitives,
  kernelWhnf, levelOfNat, sameTerm
} from '../packages/kernel/dist/index.js';

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=(level:any)=>({tag:'sort',level} as const);
const C=(name:string,levels:any[]=[])=>({tag:'const',name,levels} as const);
const B=(index:number)=>({tag:'bvar',index} as const);
const App=(fn:any,arg:any)=>({tag:'app',fn,arg} as const);
const Apps=(fn:any,args:any[])=>args.reduce(App,fn);
const Pi=(domain:any,body:any,binderInfo:any='explicit')=>({tag:'pi',domain,body,binderInfo} as const);
const Lam=(domain:any,body:any,binderInfo:any='explicit')=>({tag:'lam',domain,body,binderInfo} as const);

{
  const env=new Environment({implementationProfile:'KERNEL-level-instantiation-conformance1'});
  const installed=installCorePrimitives(env,{quotients:true});
  for(const name of ['HEq','HEq.refl','HEq.rec']){
    assert.ok(installed.includes(name),`primitive installer must install ${name}`);
    assert.ok(env.findConstant(name),`environment must contain ${name}`);
  }
  assert.ok(installed.indexOf('Eq') < installed.indexOf('HEq'), 'HEq must be installed after Eq and before quotient primitives');
  assert.ok(installed.indexOf('HEq') < installed.indexOf('Quot'), 'HEq must not disturb quotient primitive installation order');

  const N={kind:'axiom',name:'N',levelParams:[],type:S(L1)};
  const n0={kind:'axiom',name:'n0',levelParams:[],type:C('N')};
  const h={kind:'axiom',name:'hHEq',levelParams:[],type:Apps(C('HEq',[L1]),[C('Nat'),C('Nat.zero'),C('Nat'),C('Nat.zero')])};
  for(const d of [N,n0,h])checkAndAddDeclaration(env,d as any);

  const motive=Lam(S(L1), Lam(B(0), Lam(Apps(C('HEq',[L1]),[C('Nat'),C('Nat.zero'),B(1),B(0)]), C('N'))), 'implicit');
  const term=Apps(C('HEq.rec',[L1,L1]),[C('Nat'),C('Nat.zero'),motive,C('n0'),C('Nat'),C('Nat.zero'),C('hHEq')]);
  assert.ok(sameTerm(kernelWhnf(env,term as any),C('n0')), 'HEq.rec over an arbitrary proof with matching endpoints must K-reduce like Lean 4.33.1');
}

const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const version=spawnSync(lean,['--version'],{encoding:'utf8'});
  assert.equal(version.status,0);
  assert.match(version.stdout,/version 4\.33\.1/);
  assert.match(version.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-heq-'));
  const good=path.join(dir,'HEqGood.lean');
  fs.writeFileSync(good,`axiom h : HEq (0 : Nat) (0 : Nat)\nexample : HEq.rec (motive := fun _ _ => Nat) 7 h = 7 := rfl\n`);
  const gr=spawnSync(lean,[good],{encoding:'utf8'});
  assert.equal(gr.status,0,gr.stderr||gr.stdout);
  const bad=path.join(dir,'HEqBad.lean');
  fs.writeFileSync(bad,`axiom h : HEq (0 : Nat) (1 : Nat)\nexample : HEq.rec (motive := fun _ _ => Nat) 7 h = 7 := rfl\n`);
  const br=spawnSync(lean,[bad],{encoding:'utf8'});
  assert.notEqual(br.status,0,'Lean must keep mismatched HEq endpoints stuck');
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log(`KERNEL_HEQ_PRIMITIVE0=PASS${lean?' exact-lean=PASS':' exact-lean=SKIPPED'}`);
