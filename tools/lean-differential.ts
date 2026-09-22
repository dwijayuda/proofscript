import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Environment,checkAndAddDeclaration,collectConstNames,pretty} from "../packages/kernel/dist/index.js";
import {PINNED_LEAN_VERSION,probeLean} from "./lib/lean-toolchain.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cli=path.join(root,"packages/cli/dist/cli.js");
const args=process.argv.slice(2);
const opt=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const has=(name)=>args.includes(name);
const leanBin=opt("--lean")??process.env.PROOFSCRIPT_LEAN_BIN??"lean";
const manifestPath=path.resolve(root,opt("--manifest")??"tests/differential/manifest.json");
const reportPath=path.resolve(root,opt("--report")??"artifacts/LEAN_4_33_1_DIFFERENTIAL_REPORT.json");
const allowMissing=has("--allow-missing");
const STATUS_EXIT={accepted:0,rejected:1,unsupported:2};
const CASE_CLASSES=new Set(["semantic-equivalence","negative-agreement","capability-gap"]);

function normalizeLeanOutput(text,workDir){
  let out=String(text??"").replaceAll("\r\n","\n");
  const work=path.resolve(workDir).replaceAll("\\","/");
  out=out.replaceAll(path.resolve(workDir),"<WORK>").replaceAll(work,"<WORK>");
  return out.split("\n").map(line=>line.trimEnd()).join("\n").trim();
}
function semanticLeanOutput(text){
  return String(text??"").split("\n").map(line=>line.trim()).filter(line=>line.includes("PSDIFF ")).join("\n");
}
function outerBinderInfo(term){
  const out=[];let cur=term;
  while(cur?.tag==="pi"){out.push(cur.binderInfo??"explicit");cur=cur.body;}
  return out;
}
function checkedEnvironment(artifact){
  const replayProfile = typeof artifact.implementationProfile === "string" && artifact.implementationProfile.startsWith("KERNEL-")
    ? artifact.implementationProfile
    : "KERNEL-level-instantiation-conformance1";
  const env=new Environment({implementationProfile:replayProfile});
  for(const declaration of artifact.declarations)checkAndAddDeclaration(env,declaration);
  return env;
}
function artifactSnapshot(artifact,summary){
  const byName=new Map(summary.declarations.map(d=>[d.name,d]));
  const env=checkedEnvironment(artifact);
  return{
    formatVersion:artifact.formatVersion,
    implementationProfile:artifact.implementationProfile,
    declarations:artifact.declarations.map(d=>({
      name:d.name,kind:d.kind,universes:[...d.levelParams],
      type:byName.get(d.name)?.type??pretty(d.type),
      binders:outerBinderInfo(d.type),
      reducibility:d.kind==="definition"?d.reducibility:undefined,
      generated:byName.get(d.name)?.generated??[],
      assumptions:byName.get(d.name)?.assumptions??[],
      constructors:d.kind==="inductive"?d.constructors.map(c=>c.name):undefined,
    })),
    environmentDeclarations:env.all().map(checked=>({
      name:checked.declaration.name,
      kind:checked.declaration.kind,
      universes:[...checked.declaration.levelParams],
      type:pretty(checked.declaration.type),
      binders:outerBinderInfo(checked.declaration.type),
      assumptions:[...checked.assumptions].sort(),
      generated:[...checked.generated],
    })),
    assumptions:[...summary.assumptions],
    typeclasses:artifact.typeclasses,
    modules:artifact.modules??null,
  };
}
function deepEqual(a,b){try{assert.deepEqual(a,b);return true;}catch{return false;}}
function findDecl(snapshot,name,environment=false){return (environment?snapshot.environmentDeclarations:snapshot.declarations).find(d=>d.name===name);}
function checkActual(check,{snapshot,artifact,summary}){
  switch(check.kind){
    case "declarationField":{
      const d=findDecl(snapshot,check.name,false);if(!d)throw new Error(`missing declaration ${check.name}`);return d[check.field];
    }
    case "environmentField":{
      const d=findDecl(snapshot,check.name,true);if(!d)throw new Error(`missing checked environment declaration ${check.name}`);return d[check.field];
    }
    case "moduleOwner":{
      const owners=(snapshot.modules?.modules??[]).filter(m=>m.declarations.includes(check.declaration)).map(m=>m.name);return owners;
    }
    case "moduleImports":{
      const m=(snapshot.modules?.modules??[]).find(x=>x.name===check.module);if(!m)throw new Error(`missing module ${check.module}`);return m.imports.map(i=>i.module);
    }
    case "moduleDeclarations":{
      const m=(snapshot.modules?.modules??[]).find(x=>x.name===check.module);if(!m)throw new Error(`missing module ${check.module}`);return [...m.declarations];
    }
    case "typeclassInstances":return artifact.typeclasses.instances.map(i=>i.name);
    case "definitionUsesConst":{
      const d=artifact.declarations.find(x=>x.name===check.name);if(!d||!("value" in d))throw new Error(`missing valued declaration ${check.name}`);return collectConstNames(d.value).has(check.constName);
    }
    case "diagnostic":return summary.message??"";
    default:throw new Error(`unknown proofscript check kind ${check.kind}`);
  }
}
function evaluateCheck(check,context){
  let actual;
  try{actual=checkActual(check,context);}catch(e){return{id:check.id,passed:false,error:String(e),actual:null};}
  let passed=false;
  switch(check.op??"equals"){
    case "equals":passed=deepEqual(actual,check.expected);break;
    case "includes":passed=Array.isArray(actual)&&check.expected.every(x=>actual.includes(x));break;
    case "contains":passed=typeof actual==="string"&&actual.includes(check.expected);break;
    case "matches":passed=typeof actual==="string"&&new RegExp(check.expected).test(actual);break;
    default:return{id:check.id,passed:false,error:`unknown check op ${check.op}`,actual};
  }
  return{id:check.id,passed,actual,expected:check.expected,op:check.op??"equals",error:passed?undefined:`proofscript evidence check ${check.id} failed`};
}
function validateManifest(manifest){
  assert.equal(manifest.schema,2,"differential manifest schema must be 2");
  assert.equal(manifest.leanSemanticBaseline,PINNED_LEAN_VERSION,`differential manifest baseline must be ${PINNED_LEAN_VERSION}`);
  assert.ok(Array.isArray(manifest.requiredDimensions)&&manifest.requiredDimensions.length>0,"requiredDimensions must be nonempty");
  assert.equal(new Set(manifest.requiredDimensions).size,manifest.requiredDimensions.length,"requiredDimensions must be unique");
  const ids=new Set();
  for(const c of manifest.cases){
    assert.ok(!ids.has(c.id),`duplicate differential case ${c.id}`);ids.add(c.id);
    assert.ok(CASE_CLASSES.has(c.classification),`invalid classification for ${c.id}`);
    assert.ok(STATUS_EXIT[c.proofscriptExpectedStatus]!==undefined,`invalid ProofScript status for ${c.id}`);
    assert.ok(["accepted","rejected"].includes(c.leanReferenceExpectedStatus),`invalid Lean reference status for ${c.id}`);
    if(c.classification==="semantic-equivalence"){assert.equal(c.proofscriptExpectedStatus,"accepted");assert.equal(c.leanReferenceExpectedStatus,"accepted");}
    if(c.classification==="negative-agreement"){assert.equal(c.proofscriptExpectedStatus,"rejected");assert.equal(c.leanReferenceExpectedStatus,"rejected");}
    if(c.classification==="capability-gap"){
      assert.ok(c.proofscriptExpectedStatus==="unsupported"||c.proofscriptExpectedStatus==="rejected",`capability gap ${c.id} must be expected unsupported or rejected by ProofScript`);
      assert.equal(c.leanReferenceExpectedStatus,"accepted");
    }
    assert.ok(Array.isArray(c.dimensions)&&c.dimensions.length>0,`${c.id} dimensions must be nonempty`);
    const checkIds=new Set((c.proofscriptChecks??[]).map(x=>x.id));
    assert.equal(checkIds.size,(c.proofscriptChecks??[]).length,`${c.id} proofscript check ids must be unique`);
    for(const dim of c.dimensions){
      const evidence=c.evidence?.[dim];assert.ok(evidence,`${c.id} missing evidence for dimension ${dim}`);
      assert.ok(Array.isArray(evidence.proofscript)&&evidence.proofscript.length>0,`${c.id}/${dim} needs ProofScript evidence`);
      for(const id of evidence.proofscript)assert.ok(checkIds.has(id),`${c.id}/${dim} references unknown ProofScript check ${id}`);
      if(c.classification==="semantic-equivalence"){
        assert.ok(Array.isArray(evidence.lean)&&evidence.lean.length>0,`${c.id}/${dim} needs Lean evidence`);
        for(const index of evidence.lean){assert.ok(Number.isInteger(index)&&index>=0&&index<(c.probes??[]).length,`${c.id}/${dim} references invalid Lean probe ${index}`);}
      }
    }
  }
  for(const dim of manifest.requiredDimensions){
    const providers=manifest.cases.filter(c=>c.classification==="semantic-equivalence"&&c.dimensions.includes(dim));
    assert.ok(providers.length>0,`required semantic dimension has no equivalence case: ${dim}`);
    assert.ok(providers.some(c=>(c.evidence?.[dim]?.proofscript?.length??0)>0&&(c.evidence?.[dim]?.lean?.length??0)>0),`required semantic dimension lacks bilateral evidence: ${dim}`);
  }
}
function writeReport(report){fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");}

const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
validateManifest(manifest);
const probe=probeLean(leanBin);
const leanAvailable=probe.status==="accepted";
const report={
  schema:2,
  generatedAt:new Date().toISOString(),
  proofscriptReference:manifest.proofscriptReference,
  leanSemanticBaseline:manifest.leanSemanticBaseline,
  leanToolchain:probe,
  status:leanAvailable?"running":"unsupported",
  requiredDimensions:[...manifest.requiredDimensions],
  cases:[],
};
if(!leanAvailable){report.reason=probe.message;console.error(`unsupported: ${probe.message}`);}
const workRoot=path.join(root,"artifacts/differential/lean-4.33.1");
fs.rmSync(workRoot,{recursive:true,force:true});fs.mkdirSync(workRoot,{recursive:true});
let failed=false;
for(const c of manifest.cases){
  const caseDir=path.join(workRoot,c.id);fs.mkdirSync(caseDir,{recursive:true});
  const core=path.join(caseDir,"ProofScript.pscore.json");
  const generatedBase=path.join(caseDir,"Generated.base.lean");
  const generatedObserved=path.join(caseDir,"Generated.observed.lean");
  const referenceObserved=path.join(caseDir,"Reference.observed.lean");
  const source=path.resolve(root,c.proofscript);
  const checkArgs=["check",source];if(c.std)checkArgs.push("--std");if(c.proofscriptExpectedStatus==="accepted")checkArgs.push("--emit-core",core);checkArgs.push("--json");
  const checked=spawnSync(process.execPath,[cli,...checkArgs],{cwd:root,encoding:"utf8"});
  let summary=null;const psErrors=[];
  try{summary=JSON.parse(checked.stdout);}catch{psErrors.push(`ProofScript did not emit JSON summary (exit ${checked.status})`);}
  const expectedExit=STATUS_EXIT[c.proofscriptExpectedStatus];
  if(checked.status!==expectedExit)psErrors.push(`ProofScript expected ${c.proofscriptExpectedStatus}/exit ${expectedExit}, got exit ${checked.status}`);
  if(summary?.status!==c.proofscriptExpectedStatus)psErrors.push(`ProofScript summary expected ${c.proofscriptExpectedStatus}, got ${summary?.status??"<none>"}`);
  let artifact=null,snapshot=null,checks=[];
  if(c.proofscriptExpectedStatus==="accepted"&&psErrors.length===0){
    artifact=JSON.parse(fs.readFileSync(core,"utf8"));snapshot=artifactSnapshot(artifact,summary);
  }
  if(summary){
    for(const evidenceCheck of c.proofscriptChecks??[]){
      const result=evaluateCheck(evidenceCheck,{snapshot,artifact,summary});checks.push(result);if(!result.passed)psErrors.push(result.error);
    }
  }
  if(c.proofscriptExpectedStatus==="accepted"&&psErrors.length===0){
    const emitArgs=[cli,"emit-lean",core];if(c.std)emitArgs.push("--std");emitArgs.push("--out",generatedBase);
    const emitted=spawnSync(process.execPath,emitArgs,{cwd:root,encoding:"utf8"});
    if(emitted.status!==0)psErrors.push(`emit-lean failed with exit ${emitted.status}: ${(emitted.stderr||emitted.stdout||"").trim()}`);
    else{
      const probeText=`\n\n/- ProofScript differential probes: ${c.id} -/\n${(c.probes??[]).join("\n")}\n`;
      fs.writeFileSync(generatedObserved,fs.readFileSync(generatedBase,"utf8")+probeText);
    }
  }
  if(c.leanReferenceExpectedStatus==="accepted"){
    const probeText=`\n\n/- ProofScript differential probes: ${c.id} -/\n${(c.probes??[]).join("\n")}\n`;
    fs.writeFileSync(referenceObserved,fs.readFileSync(path.resolve(root,c.leanReference),"utf8")+probeText);
  }else fs.copyFileSync(path.resolve(root,c.leanReference),referenceObserved);

  const baseResult={
    id:c.id,classification:c.classification,dimensions:c.dimensions,
    expectations:{proofscript:c.proofscriptExpectedStatus,leanReference:c.leanReferenceExpectedStatus},
    proofscript:path.relative(root,source),leanReference:path.relative(root,path.resolve(root,c.leanReference)),
    proofscriptResult:{exitCode:checked.status,status:summary?.status??null,message:summary?.message??null,evidenceChecks:checks,observation:snapshot},
    leanGenerated:null,leanReferenceObservation:null,errors:[...psErrors],
  };
  if(psErrors.length){baseResult.status="rejected";report.cases.push(baseResult);failed=true;console.error(`✗ ${c.id}: ${psErrors.join("; ")}`);continue;}
  if(!leanAvailable){baseResult.status="unsupported";baseResult.errors.push(probe.message);report.cases.push(baseResult);console.log(`◇ prepared ${c.id} [${c.classification}]: ${c.dimensions.join(", ")}`);continue;}

  const ref=spawnSync(leanBin,[referenceObserved],{cwd:caseDir,encoding:"utf8"});
  const refOut=normalizeLeanOutput((ref.stdout||"")+(ref.stderr||""),caseDir);
  const errors=[];
  const refExpectedExit=c.leanReferenceExpectedStatus==="accepted"?0:null;
  if(c.leanReferenceExpectedStatus==="accepted"&&ref.status!==0)errors.push(`reference Lean expected acceptance, got exit ${ref.status}`);
  if(c.leanReferenceExpectedStatus==="rejected"&&ref.status===0)errors.push("reference Lean expected rejection, but accepted");
  let gen=null,genOut="",genSemantic="";
  if(c.classification==="semantic-equivalence"){
    gen=spawnSync(leanBin,[generatedObserved],{cwd:caseDir,encoding:"utf8"});
    genOut=normalizeLeanOutput((gen.stdout||"")+(gen.stderr||""),caseDir);
    if(gen.status!==0)errors.push(`generated Lean rejected with exit ${gen.status}`);
    const refSemantic=semanticLeanOutput(refOut);genSemantic=semanticLeanOutput(genOut);
    if(gen.status===0&&ref.status===0&&genSemantic!==refSemantic)errors.push("canonical PSDIFF semantic observations differ between generated and handwritten reference");
    for(const expected of c.expectedContains??[]){if(!genOut.includes(expected))errors.push(`generated observation missing expected text: ${expected}`);if(!refOut.includes(expected))errors.push(`reference observation missing expected text: ${expected}`);}
    baseResult.leanGenerated={exitCode:gen.status,semanticOutput:genSemantic,output:genOut};
  }
  for(const expected of c.referenceExpectedContains??[]){if(!refOut.includes(expected))errors.push(`reference observation missing expected text: ${expected}`);}
  baseResult.leanReferenceObservation={exitCode:ref.status,semanticOutput:semanticLeanOutput(refOut),output:refOut};
  baseResult.errors.push(...errors);baseResult.status=errors.length?"rejected":"accepted";
  report.cases.push(baseResult);
  if(errors.length){failed=true;console.error(`✗ ${c.id}: ${errors.join("; ")}`);}else console.log(`✓ ${c.id} [${c.classification}]: ${c.dimensions.join(", ")}`);
}
const coverage={};
for(const dim of manifest.requiredDimensions){
  const cases=report.cases.filter(c=>c.classification==="semantic-equivalence"&&c.dimensions.includes(dim));
  coverage[dim]={cases:cases.map(c=>c.id),status:cases.some(c=>c.status==="accepted")?"accepted":cases.some(c=>c.status==="rejected")?"rejected":"unsupported"};
}
report.coverage=coverage;
if(failed)report.status="rejected";else if(leanAvailable)report.status="accepted";else report.status="unsupported";
report.summary={
  total:report.cases.length,
  semanticEquivalence:report.cases.filter(c=>c.classification==="semantic-equivalence").length,
  negativeAgreement:report.cases.filter(c=>c.classification==="negative-agreement").length,
  capabilityGaps:report.cases.filter(c=>c.classification==="capability-gap").length,
  accepted:report.cases.filter(c=>c.status==="accepted").length,
  rejected:report.cases.filter(c=>c.status==="rejected").length,
  unsupported:report.cases.filter(c=>c.status==="unsupported").length,
};
writeReport(report);
console.log(`wrote differential evidence report: ${path.relative(root,reportPath)}`);
if(failed)process.exit(1);
if(!leanAvailable)process.exit(allowMissing?0:2);
process.exit(0);
