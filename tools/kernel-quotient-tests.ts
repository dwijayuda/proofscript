import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment, checkAndAddDeclaration, checkCoreDeclarations,
  expectedEqType, expectedEqReflType, quotientSoundAxiom,
  levelOfNat, levelParam, infer, kernelWhnf, defEq, sameTerm,
} from "../packages/kernel/dist/index.js";
import { decodeArtifact, makeKernelArtifact, ArtifactError } from "../packages/kernel-codec/dist/index.js";
import { verifyFile } from "../packages/verifier/dist/index.js";

const L0=levelOfNat(0), L1=levelOfNat(1);
const S=level=>({tag:"sort",level});
const C=(name,levels=[])=>({tag:"const",name,levels});
const B=index=>({tag:"bvar",index});
const App=(fn,arg)=>({tag:"app",fn,arg});
const Apps=(fn,args)=>args.reduce(App,fn);
const Pi=(domain,body,binderInfo="explicit")=>({tag:"pi",domain,body,binderInfo});
const Lam=(domain,body,binderInfo="explicit")=>({tag:"lam",domain,body,binderInfo});
const Arrow=(domain,body)=>Pi(domain,body,"explicit");

function exactEq(){
  return {kind:"inductive",name:"Eq",levelParams:["u"],type:expectedEqType("u"),numParams:2,numIndices:1,constructors:[{name:"Eq.refl",type:expectedEqReflType("u")}]};
}
function envWithEq(){ const env=new Environment(); checkAndAddDeclaration(env,exactEq()); return env; }
function addQuot(env){return checkAndAddDeclaration(env,{kind:"quot",name:"Quot",levelParams:[]});}

// Independently encode the pinned Lean 4.33.1 primitive signatures used as the test oracle.
function expectedQuotTypes(){
  const u=levelParam("u"),v=levelParam("v");
  // Independent named construction lowered to de Bruijn terms. This intentionally
  // does not call the production quotient generator.
  const V=n=>({tag:"v",name:n}); const NS=l=>({tag:"s",level:l}); const NC=(name,levels=[])=>({tag:"c",name,levels});
  const NA=(fn,arg)=>({tag:"a",fn,arg}); const NAs=(fn,args)=>args.reduce(NA,fn);
  const NP=(name,domain,body,binderInfo="explicit")=>({tag:"p",name,domain,body,binderInfo});
  const NArr=(d,b)=>NP("_",d,b,"explicit");
  const lower=(t,names=[])=>{switch(t.tag){case"s":return S(t.level);case"v":{for(let i=names.length-1;i>=0;i--)if(names[i]===t.name)return B(names.length-1-i);throw Error(`test unbound ${t.name}`);}case"c":return C(t.name,t.levels);case"a":return App(lower(t.fn,names),lower(t.arg,names));case"p":return Pi(lower(t.domain,names),lower(t.body,[...names,t.name]),t.binderInfo);}};
  const alpha=V("α"),r=V("r"),beta=V("β"),f=V("f"),a=V("a"),b=V("b"),q=V("q");
  const rel=NArr(alpha,NArr(alpha,NS(L0))); const quotR=NAs(NC("Quot",[u]),[alpha,r]);
  const quot=lower(NP("α",NS(u),NP("r",rel,NS(u),"explicit"),"implicit"));
  const quotMk=lower(NP("α",NS(u),NP("r",rel,NP("a",alpha,quotR,"explicit"),"explicit"),"implicit"));
  const sound=NP("a",alpha,NP("b",alpha,NArr(NAs(r,[a,b]),NAs(NC("Eq",[v]),[beta,NAs(f,[a]),NAs(f,[b])])),"explicit"),"explicit");
  const lift=lower(NP("α",NS(u),NP("r",rel,NP("β",NS(v),NP("f",NArr(alpha,beta),NP("sound",sound,NP("q",quotR,beta,"explicit"),"explicit"),"explicit"),"implicit"),"implicit"),"implicit"));
  const motive=NArr(quotR,NS(L0)); const mk=NAs(NC("Quot.mk",[u]),[alpha,r,a]);
  const ind=lower(NP("α",NS(u),NP("r",rel,NP("β",motive,NP("mk",NP("a",alpha,NAs(beta,[mk]),"explicit"),NP("q",quotR,NAs(beta,[q]),"explicit"),"explicit"),"implicit"),"implicit"),"implicit"));
  return {Quot:quot,"Quot.mk":quotMk,"Quot.lift":lift,"Quot.ind":ind};
}

// Positive admission and exact generated primitive signatures.
{
  const env=envWithEq(); const checked=addQuot(env);
  assert.deepEqual(checked.generated,["Quot","Quot.mk","Quot.lift","Quot.ind","Quot.sound"]);
  const expected=expectedQuotTypes();
  for(const name of ["Quot","Quot.mk","Quot.lift","Quot.ind"]){
    const entry=env.get(name); assert.ok(entry,`missing ${name}`); assert.equal(entry.declaration.kind,"quotient");
    assert.ok(sameTerm(entry.declaration.type,expected[name]),`${name} type differs from pinned expected signature`);
  }
  const sound=env.get("Quot.sound"); assert.ok(sound, "missing Quot.sound"); assert.equal(sound.declaration.kind,"axiom"); assert.ok(sameTerm(sound.declaration.type, quotientSoundAxiom().type), "Quot.sound type differs from pinned expected signature");
}

// Quot.lift and Quot.ind compute on Quot.mk in trusted WHNF/defEq.
{
  const env=envWithEq(); addQuot(env);
  checkAndAddDeclaration(env,{kind:"axiom",name:"A",levelParams:[],type:S(L1)});
  checkAndAddDeclaration(env,{kind:"axiom",name:"a",levelParams:[],type:C("A")});
  const A=C("A"), a=C("a"), eqA=Apps(C("Eq",[L1]),[A]);
  const f=Lam(A,B(0));
  const sound=Lam(A,Lam(A,Lam(Apps(eqA,[B(1),B(0)]),B(0))));
  const q=Apps(C("Quot.mk",[L1]),[A,eqA,a]);
  const lift=Apps(C("Quot.lift",[L1,L1]),[A,eqA,A,f,sound,q]);
  assert.ok(defEq(env,[],infer(env,[],lift),A));
  assert.ok(defEq(env,[],kernelWhnf(env,lift),a));

  const motive=Lam(Apps(C("Quot",[L1]),[A,eqA]),Apps(C("Eq",[L1]),[A,a,a]));
  const refl=Apps(C("Eq.refl",[L1]),[A,a]);
  const witness=Lam(A,refl);
  const ind=Apps(C("Quot.ind",[L1]),[A,eqA,motive,witness,q]);
  assert.ok(defEq(env,[],kernelWhnf(env,ind),refl));
}

// Quot.sound is not a computational primitive; it is installed by the quotient marker as an explicit axiom and assumption.
{
  const env=envWithEq(); addQuot(env); const checked=env.get("Quot.sound");
  assert.ok(checked); assert.equal(checked.declaration.kind,"axiom");
  assert.deepEqual([...checked.assumptions],[]);
}

// Admission preconditions / atomicity / duplicate protection.
{
  assert.throws(()=>addQuot(new Environment()),/does not have inductive 'Eq'/);
  const env=envWithEq(); checkAndAddDeclaration(env,{kind:"axiom",name:"Quot",levelParams:[],type:S(L1)});
  assert.throws(()=>addQuot(env),/(declaration name already exists: Quot|duplicate declaration: Quot)/);
}
{
  const env=envWithEq(); addQuot(env); assert.throws(()=>addQuot(env),/(declaration name already exists: Quot|duplicate declaration: Quot)/);
}
{
  // The historical ProofScript Eq surface uses a noncanonical BinderInfo and must not satisfy init_quot.
  const wrong=exactEq(); wrong.type={...wrong.type,binderInfo:"explicit"};
  const env=new Environment(); checkAndAddDeclaration(env,wrong);
  assert.throws(()=>addQuot(env),/Eq has unexpected type/);
}
{
  const env=envWithEq();
  assert.throws(()=>checkAndAddDeclaration(env,{kind:"quot",name:"NotQuot",levelParams:[]}),/must be named 'Quot'/);
  assert.throws(()=>checkAndAddDeclaration(env,{kind:"quot",name:"Quot",levelParams:["u"]}),/cannot have universe parameters/);
}

// v13 serialization / strict replay / malformed and forged Core rejection.
{
  const artifact=makeKernelArtifact([exactEq(),{kind:"quot",name:"Quot",levelParams:[]}]);
  assert.equal(artifact.formatVersion,13); assert.equal(artifact.implementationProfile,"KERNEL-quotients0");
  const decoded=decodeArtifact(JSON.parse(JSON.stringify(artifact)));
  assert.equal(checkCoreDeclarations(decoded.declarations).status,"accepted");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-quot-")); const file=path.join(dir,"q.pscore.json");
  fs.writeFileSync(file,JSON.stringify(artifact)); assert.equal(verifyFile(file).status,"accepted");

  const forged=structuredClone(artifact); forged.declarations.push({kind:"quotient",name:"Quot.fake",levelParams:[],type:S(L1),quotKind:"type"});
  assert.throws(()=>decodeArtifact(forged),ArtifactError);
  const withModules={...artifact,modules:{entry:"X"}}; assert.throws(()=>decodeArtifact(withModules),/do not carry frontend module metadata/);
  const badMarker=structuredClone(artifact); badMarker.declarations[1].levelParams=["u"]; assert.throws(()=>decodeArtifact(badMarker),/malformed quotient kernel declaration/);
  const wrongOrder=makeKernelArtifact([{kind:"quot",name:"Quot",levelParams:[]},exactEq()]); const f2=path.join(dir,"wrong-order.pscore.json");fs.writeFileSync(f2,JSON.stringify(wrongOrder));assert.equal(verifyFile(f2).status,"rejected");
  const v12={...artifact,formatVersion:12,implementationProfile:"K3c-section-vars0"}; assert.throws(()=>decodeArtifact(v12),/kind invalid/);
  fs.rmSync(dir,{recursive:true,force:true});
}

// Canonical Quot.sound is part of the trusted quotient primitive theory, not a user axiom requiring allow-listing.
{
  const artifact=makeKernelArtifact([exactEq(),{kind:"quot",name:"Quot",levelParams:[]}]);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-quot-sound-")); const file=path.join(dir,"q.pscore.json"); fs.writeFileSync(file,JSON.stringify(artifact));
  const accepted=verifyFile(file); assert.equal(accepted.status,"accepted");
  assert.deepEqual(accepted.assumptions ?? [], []); fs.rmSync(dir,{recursive:true,force:true});
}

// Optional exact-Lean 4.33.1 executable evidence. This does not make Lean a standalone dependency.
const lean=process.env.PROOFSCRIPT_LEAN_BIN;
if(lean){
  const ver=spawnSync(lean,["--version"],{encoding:"utf8"}); assert.equal(ver.status,0); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-quot-lean-")); const file=path.join(dir,"QuotKernel.lean");
  fs.writeFileSync(file,`universe u v\n\n#check @Quot\n#check @Quot.mk\n#check @Quot.lift\n#check @Quot.ind\n#print Quot.sound\n\ndef liftId {α : Sort u} (a : α) : Quot (@Eq α) := Quot.mk (@Eq α) a\nexample {α : Sort u} (a : α) : Quot.lift (r := @Eq α) (fun x => x) (fun _ _ h => h) (liftId a) = a := rfl\n\nexample {α : Sort u} (a : α) : @Quot.ind α (@Eq α) (fun _ => a = a) (fun _ => rfl) (Quot.mk (@Eq α) a) = rfl := by rfl\n`);
  const run=spawnSync(lean,[file],{encoding:"utf8"}); if(run.status!==0){console.error(run.stdout,run.stderr);process.exit(1);} assert.match(run.stdout,/Quot\.sound/); fs.rmSync(dir,{recursive:true,force:true});
  console.log("✓ exact Lean 4.33.1 quotient primitive/type/computation evidence passed");
}else console.log("○ exact Lean quotient oracle unavailable (standalone quotient tests still passed)");

console.log("✓ trusted kernel quotient tests passed");
