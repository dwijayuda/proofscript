import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment, checkAndAddDeclaration, checkCoreDeclarations,
  expectedEqType, expectedEqReflType,
  levelOfNat, levelParam, levelSucc, binderInfoOf, infer, defEq,
} from "../packages/kernel/dist/index.js";
import { decodeArtifact, makeKernelArtifact, makeKernelEmptyArtifact, ArtifactError } from "../packages/kernel-codec/dist/index.js";
import { verifyFile } from "../packages/verifier/dist/index.js";

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=level=>({tag:"sort",level});
const C=(name,levels=[])=>({tag:"const",name,levels});
const B=index=>({tag:"bvar",index});
const App=(fn,arg)=>({tag:"app",fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo="explicit")=>({tag:"pi",domain,body,binderInfo});
const Lam=(domain,body,binderInfo="explicit")=>({tag:"lam",domain,body,binderInfo});

const exactEnv=()=>new Environment({recursorProfile:"lean4331",allowEmptyInductives:true});
const legacyEnv=()=>new Environment();
const E0={kind:"inductive",name:"E0",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[]};
const F0={kind:"inductive",name:"F0",levelParams:[],type:S(L0),numParams:0,numIndices:0,constructors:[]};
const u=levelParam("u"), TypeU=S(levelSucc(u));
const EP={kind:"inductive",name:"EP",levelParams:["u"],type:Pi(TypeU,TypeU),numParams:1,numIndices:0,constructors:[]};
const EI={kind:"inductive",name:"EI",levelParams:["u"],type:Pi(TypeU,Pi(B(0),TypeU)),numParams:1,numIndices:1,constructors:[]};
function exactEq(){return{kind:"inductive",name:"Eq",levelParams:["u"],type:expectedEqType("u"),numParams:2,numIndices:1,constructors:[{name:"Eq.refl",type:expectedEqReflType("u")}]} ;}

function outerBinders(t){const out=[];while(t.tag==="pi"){out.push(binderInfoOf(t));t=t.body;}return out;}

// Historical/default kernel profile must not silently acquire empty-inductive semantics.
for(const d of [E0,F0,EP,EI]) assert.throws(()=>checkAndAddDeclaration(legacyEnv(),d),/empty inductives unavailable/);

// Lean 4.33.1 empty recursor signatures: motive universe first, params/indices implicit,
// motive explicit (no minors), major explicit.
for(const [decl,expectedBinders,expectedLevels] of [
  [E0,["explicit","explicit"],["u_motive"]],
  [F0,["explicit","explicit"],["u_motive"]],
  [EP,["implicit","explicit","explicit"],["u_motive","u"]],
  [EI,["implicit","implicit","explicit","explicit"],["u_motive","u"]],
]){
  const env=exactEnv();const checked=checkAndAddDeclaration(env,decl);
  assert.deepEqual(checked.generated,[`${decl.name}.rec`]);
  const rec=env.get(`${decl.name}.rec`);assert.ok(rec);assert.equal(rec.declaration.kind,"recursor");
  assert.deepEqual(rec.declaration.levelParams,expectedLevels);
  assert.deepEqual(outerBinders(rec.declaration.type),expectedBinders);
  assert.equal(rec.declaration.metadata.numMinors,0);
}

// Empty Prop elimination may target arbitrary Sort in the exact profile.
{
  const env=exactEnv();checkAndAddDeclaration(env,F0);
  checkAndAddDeclaration(env,{kind:"axiom",name:"A",levelParams:[],type:S(L1)});
  checkAndAddDeclaration(env,{kind:"axiom",name:"f0",levelParams:[],type:C("F0")});
  const motive=Lam(C("F0"),C("A"));
  const elim=Apps(C("F0.rec",[L1]),[motive,C("f0")]);
  assert.ok(defEq(env,[],infer(env,[],elim),C("A")));
}

// Shared recursor-fidelity repair: canonical Eq.rec now has Lean's motive-first
// universe order and exact outer BinderInfo pattern in the v14 profile.
{
  const env=exactEnv();checkAndAddDeclaration(env,exactEq());
  const rec=env.get("Eq.rec");assert.ok(rec);assert.equal(rec.declaration.kind,"recursor");
  assert.deepEqual(rec.declaration.levelParams,["u_motive","u"]);
  assert.deepEqual(outerBinders(rec.declaration.type),["implicit","implicit","implicit","explicit","implicit","explicit"]);
  // The motive itself quantifies the index explicitly, as Lean does for Eq.
  let t=rec.declaration.type; t=t.body.body; // after α,a: motive binder
  assert.equal(t.tag,"pi"); assert.equal(binderInfoOf(t),"implicit");
  assert.equal(t.domain.tag,"pi"); assert.equal(binderInfoOf(t.domain),"explicit");
}

// Constructor-local BinderInfo is preserved in nonempty recursor minors; IH remains explicit.
{
  const R={kind:"inductive",name:"RBI",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:"RBI.z",type:C("RBI")},
    {name:"RBI.s",type:Pi(C("RBI"),C("RBI"),"implicit")},
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,R);
  const rec=env.get("RBI.rec").declaration;assert.equal(rec.kind,"recursor");
  assert.deepEqual(outerBinders(rec.type),["implicit","explicit","explicit","explicit"]);
  let t=rec.type.body.body; // second minor
  assert.equal(t.tag,"pi");
  assert.equal(t.domain.tag,"pi");assert.equal(binderInfoOf(t.domain),"implicit");
  assert.equal(t.domain.body.tag,"pi");assert.equal(binderInfoOf(t.domain.body),"explicit");
}

// v14 serialization/replay allows empty inductives; historical v13/v12 profiles reject them.
{
  const artifact=makeKernelEmptyArtifact([E0,F0,EP,EI,exactEq()]);
  assert.equal(artifact.formatVersion,14);assert.equal(artifact.implementationProfile,"KERNEL-empty-inductives0");
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,"accepted");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-empty-"));const file=path.join(dir,"empty.pscore.json");
  fs.writeFileSync(file,JSON.stringify(artifact));assert.equal(verifyFile(file).status,"accepted");

  const v13={...artifact,formatVersion:13,implementationProfile:"KERNEL-quotients0"};
  assert.throws(()=>decodeArtifact(v13),/empty inductives unavailable/);
  const v12={...artifact,formatVersion:12,implementationProfile:"K3c-section-vars0"};
  assert.throws(()=>decodeArtifact(v12),/empty inductives unavailable/);
  const withModules={...artifact,modules:{entry:"X"}};assert.throws(()=>decodeArtifact(withModules),/do not carry frontend module metadata/);
  fs.rmSync(dir,{recursive:true,force:true});
}

// Atomicity: a colliding generated recursor rejects the declaration without installing its self entry.
{
  const env=exactEnv();checkAndAddDeclaration(env,{kind:"axiom",name:"E0.rec",levelParams:["u_motive"],type:S(L1)});
  assert.throws(()=>checkAndAddDeclaration(env,E0),/duplicate declaration: E0\.rec/);
  assert.equal(env.has("E0"),false);
}

// Malformed empty declarations remain rejected by the kernel, not accepted because they have no constructors.
{
  const bad={...EI,numIndices:2};assert.throws(()=>checkAndAddDeclaration(exactEnv(),bad),/telescope (shorter|arity mismatch)/);
  const badType={...E0,type:C("Missing")};assert.throws(()=>checkAndAddDeclaration(exactEnv(),badType),/(unknown constant|codomain must be Sort\/Type)/);
}

// Optional exact Lean 4.33.1 observations for recursor universe order/BinderInfo/empty elimination.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,["--version"],{encoding:"utf8"});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-empty-lean-"));const file=path.join(dir,"EmptyKernel.lean");
  fs.writeFileSync(file,`universe u\ninductive E0 : Type where\ninductive F0 : Prop where\ninductive EP (α : Type u) : Type u where\ninductive EI (α : Type u) : α → Type u where\ninductive EqX {α : Sort u} (a : α) : α → Prop where | refl : EqX a a\nset_option pp.universes true in set_option pp.explicit true in #check @E0.rec\nset_option pp.universes true in set_option pp.explicit true in #check @F0.rec\nset_option pp.universes true in set_option pp.explicit true in #check @EP.rec\nset_option pp.universes true in set_option pp.explicit true in #check @EI.rec\nset_option pp.universes true in set_option pp.explicit true in #check @EqX.rec\n`);
  const r=spawnSync(lean,[file],{encoding:"utf8"});assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/E0\.rec\.\{u_1\} : \(motive : E0 → Sort u_1\)/);
  assert.match(r.stdout,/@EP\.rec\.\{u_1, u_2\} : \{α : Type u_2\} → \(motive : EP\.\{u_2\} α → Sort u_1\)/s);
  assert.match(r.stdout,/@EI\.rec\.\{u_1, u_2\} : \{α : Type u_2\} → \{a : α\} → \(motive : EI\.\{u_2\} α a → Sort u_1\)/s);
  assert.match(r.stdout,/@EqX\.rec\.\{u_1,\s*u_2\} : \{α : Sort u_2\} →\s*\{a : α\} →\s*\{motive :/s);
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log("✓ kernel v14 empty inductives, exact empty elimination, recursor BinderInfo/universe order, historical artifact gating, replay, and adversarial checks passed");
