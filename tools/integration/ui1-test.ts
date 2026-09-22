import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"integration-fixtures/ui1/bool-let.ps"),"utf8");
const checked=checkUnifiedSource(source);
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,"accepted");
assert.equal(checked.coreArtifact.formatVersion,71);
assert.equal(checked.coreArtifact.implementationProfile,"KERNEL-level-instantiation-conformance1");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.match(checked.sourceSha256,/^[0-9a-f]{64}$/);
assert.match(checked.semanticIrSha256,/^[0-9a-f]{64}$/);
assert.match(checked.coreSha256,/^[0-9a-f]{64}$/);
assert.notEqual(checked.semanticIrSha256,checked.coreSha256);

function visitTerm(term, f){
  f(term);
  if(term.tag==="app"){visitTerm(term.fn,f);visitTerm(term.arg,f);}
  else if(term.tag==="lam"||term.tag==="pi"){visitTerm(term.domain,f);visitTerm(term.body,f);}
  else if(term.tag==="let"){visitTerm(term.type,f);visitTerm(term.value,f);visitTerm(term.body,f);}
  else if(term.tag==="proj")visitTerm(term.expr,f);
}
let sawBoolRec=false, sawLet=false, sawBoolTrue=false, sawBoolFalse=false;
for(const d of checked.coreArtifact.declarations){
  for(const key of ["type","value"]){
    const t=d[key]; if(!t)continue;
    visitTerm(t,(x)=>{
      if(x.tag==="const"&&x.name==="Bool.rec")sawBoolRec=true;
      if(x.tag==="const"&&x.name==="Bool.true")sawBoolTrue=true;
      if(x.tag==="const"&&x.name==="Bool.false")sawBoolFalse=true;
      if(x.tag==="let")sawLet=true;
    });
  }
}
assert.equal(sawBoolRec,true,"UI1 Core must contain Bool.rec lowering for bif");
assert.equal(sawLet,true,"UI1 Core must contain a native let term");
assert.equal(sawBoolTrue,true);
assert.equal(sawBoolFalse,true);

const outDir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-ui1-"));
try {
  const artifactPath=path.join(outDir,"bool-let.pscore.json");
  fs.writeFileSync(artifactPath,JSON.stringify(checked.coreArtifact,null,2)+"\n");
  const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifactPath,"utf8")));
  assert.equal(decoded.formatVersion,71);
  assert.equal(verifyFile(artifactPath,standardBootstrapAxiomSet()).status,"accepted");

  const tsPath=path.join(outDir,"bool-let.ts");
  fs.writeFileSync(tsPath,checked.typescript+`\nconsole.log("UI1_TRUE="+resultTrue().toString());\nconsole.log("UI1_FALSE="+resultFalse().toString());\nconsole.log("UI1_BOOL="+String(identityBool(true)));\n`);
  fs.writeFileSync(path.join(outDir,"package.json"),'{"type":"module"}\n');
  const tsc=spawnSync("tsc",["bool-let.ts","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","--skipLibCheck","--outDir","js"],{cwd:outDir,encoding:"utf8"});
  assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const runtime=spawnSync(process.execPath,[path.join(outDir,"js/bool-let.js")],{encoding:"utf8"});
  assert.equal(runtime.status,0,runtime.stderr||runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/),["UI1_TRUE=42","UI1_FALSE=0","UI1_BOOL=true"]);

  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){
    const oracleArtifact=stripStandardBootstrap(decoded)??decoded;
    const leanPath=path.join(outDir,"bool-let.lean");
    fs.writeFileSync(leanPath,emitLeanArtifact(oracleArtifact)+"\n#reduce resultTrue\n#reduce resultFalse\n#reduce identityBool true\n");
    const lean=spawnSync(leanBin,[leanPath],{encoding:"utf8"});
    assert.equal(lean.status,0,lean.stderr||lean.stdout);
    assert.deepEqual(lean.stdout.trim().split(/\r?\n/).filter(Boolean).slice(-3),["42","Nat.zero","true"]);
  }
} finally { fs.rmSync(outDir,{recursive:true,force:true}); }

const laterNamedIf = checkUnifiedSource("def ordinary: Nat := { if h: (1 = 1) { 2 } else { 3 } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted", "later cumulative integration must preserve UI1 while allowing named proposition-if");
assert.throws(
  ()=>checkUnifiedSource("def one: Nat := { 1 }\ntheorem bad: one = 2 := by { rfl }"),
  (e)=>e instanceof Error && /standalone kernel rejected/.test(e.message),
);
console.log("✓ UI1 Bool/bif/let frontend → Core v71 K3-TB → kernel/verifier → TS/Lean integration passed");
