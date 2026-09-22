import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment, checkAndAddDeclaration, checkCoreDeclarations,
  levelOfNat, infer, kernelWhnf, defEq, sameTerm,
} from "../packages/kernel/dist/index.js";
import { decodeArtifact, makeKernelStructureEtaArtifact } from "../packages/kernel-codec/dist/index.js";
import { verifyFile } from "../packages/verifier/dist/index.js";

const L1=levelOfNat(1);
const S=level=>({tag:"sort",level});
const C=(name,levels=[])=>({tag:"const",name,levels});
const B=index=>({tag:"bvar",index});
const App=(fn,arg)=>({tag:"app",fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo="explicit")=>({tag:"pi",domain,body,binderInfo});
const P=(typeName,index,expr)=>({tag:"proj",typeName,index,expr});
const exactEnv=()=>new Environment({recursorProfile:"lean4331",allowEmptyInductives:true,allowProjections:true,allowStructureEta:true});

const A={kind:"axiom",name:"A",levelParams:[],type:S(L1)};
const a={kind:"axiom",name:"a",levelParams:[],type:C("A")};
const b={kind:"axiom",name:"b",levelParams:[],type:C("A")};
const PairK={kind:"inductive",name:"PairK",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"PairK.mk",type:Pi(C("A"),Pi(C("A"),C("PairK")))}
]};
const RecOne={kind:"inductive",name:"RecOne",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"RecOne.mk",type:Pi(C("A"),Pi(C("RecOne"),C("RecOne")))}
]};
const ULike={kind:"inductive",name:"ULike",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[
  {name:"ULike.mk",type:C("ULike")}
]};

// Raw projections typecheck and reduce on one-constructor, zero-index inductives.
{
  const env=exactEnv();for(const d of [A,a,b,PairK])checkAndAddDeclaration(env,d);
  const mk=Apps(C("PairK.mk"),[C("a"),C("b")]);
  assert.ok(sameTerm(infer(env,[],P("PairK",0,mk)),C("A")));
  assert.ok(sameTerm(infer(env,[],P("PairK",1,mk)),C("A")));
  assert.ok(sameTerm(kernelWhnf(env,P("PairK",0,mk)),C("a")));
  assert.ok(sameTerm(kernelWhnf(env,P("PairK",1,mk)),C("b")));

  checkAndAddDeclaration(env,{kind:"axiom",name:"p",levelParams:[],type:C("PairK")});
  const rebuilt=Apps(C("PairK.mk"),[P("PairK",0,C("p")),P("PairK",1,C("p"))]);
  assert.equal(defEq(env,[],C("p"),rebuilt),true,"nonrecursive one-constructor eta must hold");
  assert.equal(defEq(env,[],rebuilt,C("p")),true,"eta must be symmetric in defEq");
}

// Zero-field one-constructor types eta-collapse to their constructor, as Lean does.
{
  const env=exactEnv();checkAndAddDeclaration(env,ULike);checkAndAddDeclaration(env,{kind:"axiom",name:"u",levelParams:[],type:C("ULike")});
  assert.equal(defEq(env,[],C("u"),C("ULike.mk")),true);
}

// Projections remain valid for recursive one-constructor zero-index types, but eta does not.
{
  const env=exactEnv();for(const d of [A,a,RecOne])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:"axiom",name:"r",levelParams:[],type:C("RecOne")});
  assert.ok(sameTerm(infer(env,[],P("RecOne",0,C("r"))),C("A")));
  assert.ok(sameTerm(infer(env,[],P("RecOne",1,C("r"))),C("RecOne")));
  const rebuilt=Apps(C("RecOne.mk"),[P("RecOne",0,C("r")),P("RecOne",1,C("r"))]);
  assert.equal(defEq(env,[],C("r"),rebuilt),false,"recursive inductives must not receive structure eta");
}

// Parameter substitution and dependent-field projection types are computed from the constructor telescope.
{
  const F={kind:"axiom",name:"F",levelParams:[],type:Pi(C("A"),S(L1))};
  const D={kind:"inductive",name:"D",levelParams:[],type:Pi(S(L1),S(L1)),numParams:1,numIndices:0,constructors:[
    // (U : Type) -> (x : A) -> (y : F x) -> D U
    {name:"D.mk",type:Pi(S(L1),Pi(C("A"),Pi(App(C("F"),B(0)),App(C("D"),B(2)))))}
  ]};
  const env=exactEnv();for(const d of [A,F,D])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:"axiom",name:"d",levelParams:[],type:App(C("D"),C("A"))});
  const p0=P("D",0,C("d")), p1=P("D",1,C("d"));
  assert.ok(sameTerm(infer(env,[],p0),C("A")));
  assert.ok(sameTerm(infer(env,[],p1),App(C("F"),p0)),"later projection type must depend on the earlier raw projection");
  const rebuilt=Apps(C("D.mk"),[C("A"),p0,p1]);
  assert.equal(defEq(env,[],C("d"),rebuilt),true);
}

// Fail closed on malformed or out-of-scope projection terms.
{
  const env=exactEnv();for(const d of [A,a,b,PairK])checkAndAddDeclaration(env,d);
  assert.throws(()=>infer(env,[],P("PairK",2,Apps(C("PairK.mk"),[C("a"),C("b")]))),/(invalid projection index|projection index .* out of range)/);
  assert.throws(()=>infer(env,[],P("Missing",0,C("a"))),/(not an inductive type|unknown or non-inductive family)/);
  assert.throws(()=>infer(env,[],P("PairK",0,C("a"))),/(invalid projection from type|major premise has type)/);
  const old=new Environment({recursorProfile:"lean4331",allowEmptyInductives:true});for(const d of [A,a,b,PairK])checkAndAddDeclaration(old,d);
  assert.throws(()=>infer(old,[],P("PairK",0,Apps(C("PairK.mk"),[C("a"),C("b")]))),/projection expressions unavailable/);
}

// Multiple-constructor and indexed projection behavior remains explicitly outside v15's trusted slice.
{
  const Multi={kind:"inductive",name:"Multi",levelParams:[],type:S(L1),numParams:0,numIndices:0,constructors:[{name:"Multi.a",type:Pi(C("A"),C("Multi"))},{name:"Multi.b",type:Pi(C("A"),C("Multi"))}]};
  const Ix={kind:"inductive",name:"Ix",levelParams:[],type:Pi(C("A"),S(L1)),numParams:0,numIndices:1,constructors:[{name:"Ix.mk",type:Pi(C("A"),App(C("Ix"),B(0)))}]};
  const env=exactEnv();for(const d of [A,a,Multi,Ix])checkAndAddDeclaration(env,d);
  checkAndAddDeclaration(env,{kind:"axiom",name:"m",levelParams:[],type:C("Multi")});
  checkAndAddDeclaration(env,{kind:"axiom",name:"ix",levelParams:[],type:App(C("Ix"),C("a"))});
  assert.throws(()=>infer(env,[],P("Multi",0,C("m"))),/(does not have exactly one constructor|non-structure family)/);
  assert.throws(()=>infer(env,[],P("Ix",0,C("ix"))),/(indexed projections are unsupported|projection typing for indexed family)/);
}

// v15 serialization/replay admits proj; v14 and older profiles cannot acquire this new term semantics.
{
  const decls=[A,a,b,PairK,{kind:"definition",name:"first",levelParams:[],type:C("A"),value:P("PairK",0,Apps(C("PairK.mk"),[C("a"),C("b")])),reducibility:"regular"}];
  const artifact=makeKernelStructureEtaArtifact(decls);
  assert.equal(artifact.formatVersion,15);assert.equal(artifact.implementationProfile,"KERNEL-structure-eta0");
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations,decoded.implementationProfile).status,"accepted");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-eta-"));const file=path.join(dir,"eta.pscore.json");
  fs.writeFileSync(file,JSON.stringify(artifact));assert.equal(verifyFile(file,new Set(["A","a","b"])).status,"accepted");
  const v14={...artifact,formatVersion:14,implementationProfile:"KERNEL-empty-inductives0"};
  assert.throws(()=>decodeArtifact(v14),/tag 'proj' is unavailable/);
  const badIndex=structuredClone(artifact);badIndex.declarations.at(-1).value.index=-1;assert.throws(()=>decodeArtifact(badIndex),/index invalid/);
  const withModules={...artifact,modules:{entry:"X"}};assert.throws(()=>decodeArtifact(withModules),/do not carry frontend module metadata/);
  fs.rmSync(dir,{recursive:true,force:true});
}

// Exact Lean 4.33.1 kernel-side observations using raw Expr.proj, not source-level projection declarations.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,["--version"],{encoding:"utf8"});assert.equal(ver.status,0);assert.match(ver.stdout,/version 4\.33\.1,/);assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-eta-lean-"));const file=path.join(dir,"EtaKernel.lean");
  fs.writeFileSync(file,`import Lean\nopen Lean Meta\nuniverse u\ninductive PairK (α : Type u) where | mk : α → α → PairK α\ninductive RecOne where | mk : Nat → RecOne → RecOne\ninductive Ix (α : Type u) : Nat → Type u where | mk : α → Ix α 0\nrun_meta\n  withLocalDeclD \`α (mkSort (.succ (.param \`u))) fun α =>\n    withLocalDeclD \`p (mkApp (mkConst \`\`PairK [(.param \`u)]) α) fun p => do\n      let p0 := mkProj \`\`PairK 0 p; let p1 := mkProj \`\`PairK 1 p\n      logInfo m!\"PSDIFF:pair-p0:{← inferType p0}\"\n      logInfo m!\"PSDIFF:pair-p1:{← inferType p1}\"\n      let rebuilt := mkApp3 (mkConst \`\`PairK.mk [(.param \`u)]) α p0 p1\n      logInfo m!\"PSDIFF:pair-eta:{← isDefEq p rebuilt}\"\nrun_meta\n  withLocalDeclD \`r (mkConst \`\`RecOne) fun r => do\n    let p0 := mkProj \`\`RecOne 0 r; let p1 := mkProj \`\`RecOne 1 r\n    let rebuilt := mkApp2 (mkConst \`\`RecOne.mk) p0 p1\n    logInfo m!\"PSDIFF:rec-p0:{← inferType p0}\"\n    logInfo m!\"PSDIFF:rec-p1:{← inferType p1}\"\n    logInfo m!\"PSDIFF:rec-eta:{← isDefEq r rebuilt}\"\nrun_meta\n  withLocalDeclD \`α (mkSort (.succ (.param \`u))) fun α =>\n    withLocalDeclD \`i (mkConst \`\`Nat) fun i =>\n      withLocalDeclD \`x (mkApp2 (mkConst \`\`Ix [(.param \`u)]) α i) fun x => do\n        let p0 := mkProj \`\`Ix 0 x\n        logInfo m!\"PSDIFF:indexed-proj:{← inferType p0}\"\n`);
  const r=spawnSync(lean,[file],{encoding:"utf8"});assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/PSDIFF:pair-p0:α/);assert.match(r.stdout,/PSDIFF:pair-p1:α/);assert.match(r.stdout,/PSDIFF:pair-eta:true/);
  assert.match(r.stdout,/PSDIFF:rec-p0:Nat/);assert.match(r.stdout,/PSDIFF:rec-p1:RecOne/);assert.match(r.stdout,/PSDIFF:rec-eta:false/);
  assert.match(r.stdout,/PSDIFF:indexed-proj:α/);
  fs.mkdirSync(path.join(process.cwd(),"artifacts"),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),"artifacts/KERNEL_STRUCTURE_ETA_DIFFERENTIAL_REPORT.json"),JSON.stringify({
    schemaVersion:1,
    semanticBaseline:"Lean 4.33.1",
    leanCommit:"819816b2e0a3bf405af45ae5c7af2491d8f5bee6",
    profile:"KERNEL-structure-eta0",
    coreFormat:15,
    status:"accepted",
    observations:{
      zeroIndexOneConstructorProjectionTyping:"accepted",
      projectionIotaReduction:"accepted",
      nonrecursiveOneConstructorEta:"accepted",
      recursiveOneConstructorEta:"rejected-as-nondefeq",
      indexedProjectionLeanObservation:"accepted",
      indexedProjectionProofScriptV15:"unsupported"
    },
    capabilityGaps:["indexed raw projection inference/checking"]
  },null,2)+"\n");
  fs.rmSync(dir,{recursive:true,force:true});
}

console.log("✓ kernel v15 raw projections, iota reduction, nonrecursive structure eta, profile gating, replay, adversarial checks, and exact Lean observations passed");
