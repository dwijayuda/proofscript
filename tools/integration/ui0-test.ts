import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkUnifiedSource, UnifiedBridgeUnsupported } from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"integration-fixtures/ui0/basic.ps"),"utf8");
const checked=checkUnifiedSource(source);
assert.equal(checked.kernelSummary.status,"accepted");
assert.equal(checked.coreArtifact.formatVersion,71);
assert.equal(checked.coreArtifact.implementationProfile,"KERNEL-level-instantiation-conformance1");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.match(checked.sourceSha256,/^[0-9a-f]{64}$/);
assert.match(checked.semanticIrSha256,/^[0-9a-f]{64}$/);
assert.match(checked.coreSha256,/^[0-9a-f]{64}$/);
assert.notEqual(checked.semanticIrSha256,checked.coreSha256);

const outDir=fs.mkdtempSync(path.join(os.tmpdir(),"proofscript-ui0-"));
try {
  const artifactPath=path.join(outDir,"basic.pscore.json");
  fs.writeFileSync(artifactPath,JSON.stringify(checked.coreArtifact,null,2)+"\n");
  const decoded=decodeArtifact(JSON.parse(fs.readFileSync(artifactPath,"utf8")));
  assert.equal(decoded.formatVersion,71);
  assert.equal(verifyFile(artifactPath,standardBootstrapAxiomSet()).status,"accepted");

  const tsPath=path.join(outDir,"basic.ts");
  fs.writeFileSync(tsPath,checked.typescript+"\nconsole.log(`UI0_RESULT=${result().toString()}`);\n");
  fs.writeFileSync(path.join(outDir,"package.json"),'{"type":"module"}\n');
  const tsc=spawnSync("tsc",["basic.ts","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","--skipLibCheck","--outDir","js"],{cwd:outDir,encoding:"utf8"});
  assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const runtime=spawnSync(process.execPath,[path.join(outDir,"js/basic.js")],{encoding:"utf8"});
  assert.equal(runtime.status,0,runtime.stderr||runtime.stdout);
  assert.equal(runtime.stdout.trim(),"UI0_RESULT=43");

  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){
    const oracleArtifact=stripStandardBootstrap(decoded)??decoded;
    const leanPath=path.join(outDir,"basic.lean");
    fs.writeFileSync(leanPath,emitLeanArtifact(oracleArtifact)+"\n#eval result\n");
    const lean=spawnSync(leanBin,[leanPath],{encoding:"utf8"});
    assert.equal(lean.status,0,lean.stderr||lean.stdout);
    const leanLines=lean.stdout.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(leanLines.at(-1),"43");
  }
} finally { fs.rmSync(outDir,{recursive:true,force:true}); }

assert.throws(
  ()=>checkUnifiedSource("def one: Nat := { 1 }\ntheorem bad: one = 2 := by { rfl }"),
  (e)=>e instanceof Error && /standalone kernel rejected/.test(e.message),
);
assert.throws(
  ()=>checkUnifiedSource("def tooLarge: Nat := { 4097 }"),
  (e)=>e instanceof UnifiedBridgeUnsupported && /exceeds the migration adapter bound/.test(e.message),
);
console.log("✓ UI0 unified frontend → Core v71 K3-TB → kernel/verifier → TS/Lean integration passed");
