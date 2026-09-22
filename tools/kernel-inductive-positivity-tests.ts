import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment, checkAndAddDeclaration, checkCoreDeclarations,
  levelOfNat, infer, kernelWhnf, sameTerm, pretty,
} from "../packages/kernel/dist/index.js";
import { decodeArtifact, makeKernelInductivePositivityArtifact, makeKernelStructureEtaArtifact } from "../packages/kernel-codec/dist/index.js";
import { verifyFile } from "../packages/verifier/dist/index.js";

const L1=levelOfNat(1);
const S=level=>({tag:"sort",level});
const C=(name,levels=[])=>({tag:"const",name,levels});
const B=index=>({tag:"bvar",index});
const App=(fn,arg)=>({tag:"app",fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo="explicit")=>({tag:"pi",domain,body,binderInfo});
const Lam=(domain,body,binderInfo="explicit")=>({tag:"lam",domain,body,binderInfo});
const exactEnv=()=>new Environment({recursorProfile:"lean4331",allowEmptyInductives:true,allowProjections:true,allowStructureEta:true,allowHigherOrderPositiveRecursion:true});

const N={kind:"axiom",name:"N",levelParams:[],type:S(L1)};
const n={kind:"axiom",name:"n",levelParams:[],type:C("N")};
const HTree={kind:"inductive",name:"HTree",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"HTree.mk",type:Pi(Pi(C("N"),C("HTree")),C("HTree"))}
]};
const HTree2={kind:"inductive",name:"HTree2",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"HTree2.leaf",type:C("HTree2")},
  {name:"HTree2.mk",type:Pi(Pi(C("N"),Pi(C("N"),C("HTree2"))),C("HTree2"))}
]};
const Bad={kind:"inductive",name:"Bad",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"Bad.mk",type:Pi(Pi(C("Bad"),C("N")),C("Bad"))}
]};

// Lean-valid higher-order strictly-positive constructor arguments are admitted.
{
  const env=exactEnv();checkAndAddDeclaration(env,N);const checked=checkAndAddDeclaration(env,HTree);
  assert.deepEqual(checked.generated,["HTree.mk","HTree.rec"]);
  const rec=env.get("HTree.rec");assert.ok(rec);assert.equal(rec.declaration.kind,"recursor");
  const text=pretty(rec.declaration.type);
  assert.match(text,/(N → HTree|Pi \(N\) -> HTree)/);
  assert.match(text,/(x0\(x1\(x2\)\)|#2 \(#1 #0\))/);
  assert.match(text,/(x0\(HTree\.mk|#2 \(HTree\.mk)/);
}

// Multiple nested positive Pi codomains produce pointwise IH telescopes.
{
  const env=exactEnv();checkAndAddDeclaration(env,N);checkAndAddDeclaration(env,HTree2);
  const rec=env.get("HTree2.rec");assert.ok(rec);const text=pretty(rec.declaration.type);
  assert.match(text,/(N → \(N → HTree2\)|Pi \(N\) -> \(Pi \(N\) -> HTree2\))/);
  assert.match(text,/(x0\(x1\(x2, x3\)\)|#2 \(#1 #0\)|#4 \(\(#2 #1\) #0\)|#3 \(\(#2 #1\) #0\))/);
}


// Dependent binders introduced *inside* a recursive function argument are allowed;
// the pointwise IH preserves their dependency.
{
  const Fam={kind:"axiom",name:"Fam",levelParams:[],type:Pi(C("N"),S(L1))};
  const Dep={kind:"inductive",name:"Dep",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:"Dep.mk",type:Pi(Pi(C("N"),Pi(App(C("Fam"),B(0)),C("Dep"))),C("Dep"))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,N);checkAndAddDeclaration(env,Fam);checkAndAddDeclaration(env,Dep);
  const rec=env.get("Dep.rec");assert.ok(rec);const text=pretty(rec.declaration.type);
  assert.match(text,/(Fam\(x2\)|Fam #0|Fam\) #0)/);assert.match(text,/(x0\(x1\(x2, x3\)\)|#2 \(#1 #0\)|#4 \(\(#2 #1\) #0\)|#3 \(\(#2 #1\) #0\))/);
}

// An arbitrary wrapper application containing Self is not a valid recursive argument;
// nested-inductive preprocessing is a separate future kernel milestone.
{
  const Wrap={kind:"axiom",name:"Wrap",levelParams:[],type:Pi(S(L1),S(L1))};
  const BadWrap={kind:"inductive",name:"BadWrap",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
    {name:"BadWrap.mk",type:Pi(App(C("Wrap"),C("BadWrap")),C("BadWrap"))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,Wrap);
  assert.throws(()=>checkAndAddDeclaration(env,BadWrap),/non-valid positive occurrence|nested\/container positivity is not implemented|unknown type former/);
}

// Uniform-parameter recursive inductives (List-shaped) use the same positivity rule
// and generate a recursive induction hypothesis after the recursive field.
{
  const PList={kind:"inductive",name:"PList",levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:"PList.nil",type:Pi(S(L1),App(C("PList"),B(0)))},
    {name:"PList.cons",type:Pi(S(L1),Pi(B(0),Pi(App(C("PList"),B(1)),App(C("PList"),B(2)))))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,PList);
  const rec=env.get("PList.rec");assert.ok(rec);const text=pretty(rec.declaration.type);
  assert.match(text,/PList/);assert.match(text,/motive/);
  const consRule=rec.declaration.metadata.rules.find(r=>r.ctor==="PList.cons");
  assert.deepEqual(consRule?.recursiveFields,[false,true]);
  assert.ok(consRule?.recursiveFieldTypes?.[1],"recursive parameterized field type must be retained for replay/iota");

  // Parameterized iota passes the uniform parameter through the recursive call.
  const A={kind:"axiom",name:"A",levelParams:[],type:S(L1)};
  const a={kind:"axiom",name:"a",levelParams:[],type:C("A")};
  const nn={kind:"axiom",name:"pn",levelParams:[],type:C("N")};
  checkAndAddDeclaration(env,N);checkAndAddDeclaration(env,A);checkAndAddDeclaration(env,a);checkAndAddDeclaration(env,nn);
  const pA=App(C("PList"),C("A"));
  const motive=Lam(pA,C("N"));
  const minorNil=C("pn");
  const minorCons=Lam(C("A"),Lam(pA,Lam(C("N"),C("pn"))));
  const nil=App(C("PList.nil"),C("A"));
  const major=Apps(C("PList.cons"),[C("A"),C("a"),nil]);
  const recApp=Apps(C("PList.rec",[L1]),[C("A"),motive,minorNil,minorCons,major]);
  assert.ok(sameTerm(kernelWhnf(env,recApp),C("pn")),`unexpected parameterized iota: ${pretty(kernelWhnf(env,recApp))}`);
  assert.ok(sameTerm(kernelWhnf(env,infer(env,[],recApp)),C("N")));

  const old=new Environment({recursorProfile:"lean4331",allowEmptyInductives:true,allowProjections:true,allowStructureEta:true});
  assert.throws(()=>checkAndAddDeclaration(old,PList),/non-direct or negative recursive occurrence|recursive constructor fields are unsupported|recursive fields in parameterized\/indexed inductives are unsupported/);
}

// Higher-order recursion under a uniform parameter preserves that parameter through
// the pointwise induction hypothesis.
{
  const PTree={kind:"inductive",name:"PTree",levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    {name:"PTree.mk",type:Pi(S(L1),Pi(Pi(C("N"),App(C("PTree"),B(1))),App(C("PTree"),B(1))))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,N);checkAndAddDeclaration(env,PTree);
  const rec=env.get("PTree.rec");assert.ok(rec);const text=pretty(rec.declaration.type);
  assert.match(text,/(N → PTree|Pi \(N\) -> \(PTree|Pi \(N\) -> PTree)/);assert.match(text,/motive|u_motive|#2/);
  const rule=rec.declaration.metadata.rules[0];assert.deepEqual(rule.recursiveFields,[true]);assert.ok(rule.recursiveFieldTypes?.[0]);
}

// Iota reduction constructs the pointwise induction hypothesis, not an invalid motive(f).
{
  const env=exactEnv();checkAndAddDeclaration(env,N);checkAndAddDeclaration(env,n);checkAndAddDeclaration(env,HTree);
  const F={kind:"axiom",name:"f",levelParams:[],type:Pi(C("N"),C("HTree"))};checkAndAddDeclaration(env,F);
  // Constant motive into N and minor returning n lets us inspect that the recursor reduces through the higher-order field.
  const motive=Lam(C("HTree"),C("N"));
  const minor=Lam(Pi(C("N"),C("HTree")),Lam(Pi(C("N"),C("N")),C("n")));
  const major=App(C("HTree.mk"),C("f"));
  const recApp=Apps(C("HTree.rec",[L1]),[motive,minor,major]);
  assert.ok(sameTerm(kernelWhnf(env,recApp),C("n")),`unexpected reduction: ${pretty(kernelWhnf(env,recApp))}`);
  assert.ok(sameTerm(kernelWhnf(env,infer(env,[],recApp)),C("N")));
}

// Indexed recursive positivity is checked even though indexed recursive recursor
// generation is a separate capability gap. A Lean-valid recursive indexed field
// reaches that explicit gap rather than being misclassified as non-positive.
{
  const J={kind:"axiom",name:"J",levelParams:[],type:S(L1)};
  const j0={kind:"axiom",name:"j0",levelParams:[],type:C("J")};
  const IX={kind:"inductive",name:"IX",levelParams:[],type:Pi(S(L1),Pi(C("J"),S(L1))),numParams:1,numIndices:1,constructors:[
    {name:"IX.mk",type:Pi(S(L1),Pi(App(App(C("IX"),B(0)),C("j0")),App(App(C("IX"),B(1)),C("j0"))))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,J);checkAndAddDeclaration(env,j0);
  assert.throws(()=>checkAndAddDeclaration(env,IX),/positive recursive indexed fields are not yet admitted because indexed recursive recursors are unsupported|indexed recursive recursors are unsupported/);
}

// Recursive occurrences inside indices are not strictly positive applications.
{
  const X={kind:"axiom",name:"X",levelParams:[],type:S(L1)};
  const Weird={kind:"inductive",name:"Weird",levelParams:[],type:Pi(S(L1),S(L1)),numParams:0,numIndices:1,constructors:[
    {name:"Weird.mk",type:Pi(App(C("Weird"),App(C("Weird"),C("X"))),App(C("Weird"),C("X")))}
  ]};
  const env=exactEnv();checkAndAddDeclaration(env,X);
  assert.throws(()=>checkAndAddDeclaration(env,Weird),/recursive occurrence of Weird inside an index is invalid/);
}

// Negative occurrences remain rejected exactly at the recursive function domain.
{
  const env=exactEnv();checkAndAddDeclaration(env,N);
  assert.throws(()=>checkAndAddDeclaration(env,Bad),/non-positive occurrence of Bad in recursive function domain|negative recursive occurrence of Bad/);
  assert.equal(env.has("Bad"),false,"failed inductive admission must remain atomic");
}

// Historical v15 must not silently acquire v16 higher-order recursion semantics.
{
  const v16=makeKernelInductivePositivityArtifact([N,HTree]);
  assert.equal(v16.formatVersion,16);assert.equal(v16.implementationProfile,"KERNEL-inductive-positivity0");
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(v16)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,"accepted");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-positive-"));const file=path.join(dir,"positive.pscore.json");
  fs.writeFileSync(file,JSON.stringify(v16));assert.equal(verifyFile(file,new Set(["N"])).status,"accepted");
  const v15={...v16,formatVersion:15,implementationProfile:"KERNEL-structure-eta0"};
  const old=decodeArtifact(v15);
  const oldResult=checkCoreDeclarations(old.declarations,old.implementationProfile);
  assert.equal(oldResult.status,"unsupported");
  assert.match(oldResult.message ?? "",/non-direct or negative recursive occurrence|higher-order positivity is disabled/);
  fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1: positive function codomains accepted; negative function domains rejected;
// recursor contains the pointwise induction hypothesis.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,["--version"],{encoding:"utf8"});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-positive-lean-"));
  const ok=path.join(dir,"Positive.lean");fs.writeFileSync(ok,`set_option pp.universes true\nset_option pp.explicit true\ninductive HTree : Type where | mk : (Nat → HTree) → HTree\ninductive PList (α : Type) where | nil | cons : α → PList α → PList α\naxiom J : Type\naxiom j0 : J\ninductive IX (α : Type) : J → Type where | mk : IX α j0 → IX α j0\n#check @HTree.rec\n#check @PList.rec\n`);
  const r=spawnSync(lean,[ok],{encoding:"utf8"});assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/\(a : Nat → HTree\) → \(\(a_1 : Nat\) → motive \(a a_1\)\)/);assert.match(r.stdout,/@PList\.rec/);
  const bad=path.join(dir,"Negative.lean");fs.writeFileSync(bad,`inductive Bad : Type where | mk : (Bad → Nat) → Bad\n`);
  const rb=spawnSync(lean,[bad],{encoding:"utf8"});assert.notEqual(rb.status,0);assert.match(rb.stderr+rb.stdout,/non positive occurrence/);
  const badIndex=path.join(dir,"BadIndex.lean");fs.writeFileSync(badIndex,`inductive Weird : Type → Type where | mk : Weird (Weird Nat) → Weird Nat\n`);
  const rbi=spawnSync(lean,[badIndex],{encoding:"utf8"});assert.notEqual(rbi.status,0);assert.match(rbi.stderr+rbi.stdout,/non valid occurrence|non positive occurrence/);
  fs.mkdirSync(path.join(process.cwd(),"artifacts"),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),"artifacts/KERNEL_INDUCTIVE_POSITIVITY_DIFFERENTIAL_REPORT.json"),JSON.stringify({
    schemaVersion:1,semanticBaseline:"Lean 4.33.1",leanCommit:"819816b2e0a3bf405af45ae5c7af2491d8f5bee6",
    profile:"KERNEL-inductive-positivity0",coreFormat:16,status:"accepted",
    observations:{higherOrderPositivePiCodomain:"accepted",uniformParameterizedRecursion:"accepted",parameterizedIota:"accepted",indexedPositiveFieldClassification:"accepted_then_capability_gap",recursiveOccurrenceInsideIndex:"rejected",negativePiDomain:"rejected",pointwiseRecursorIH:"accepted"},
    capabilityGaps:["indexed recursive recursors","mutual/nested inductive preprocessing"]
  },null,2)+"\n");
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log("✓ kernel v16 higher-order strict positivity, pointwise recursor IH/iota, profile gating, replay, negative checks, and exact Lean observations passed");
