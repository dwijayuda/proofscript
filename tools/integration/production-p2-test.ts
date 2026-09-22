import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkCoreDeclarations } from "@proofscript/kernel";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from "@proofscript/unified-bridge";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"integration-fixtures/production-p2/typeclasses.ps"),"utf8");
const checked=checkUnifiedSource(source);
assert.ok(["PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile,UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status,"accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
const names=new Set(checked.coreArtifact.declarations.map(d=>d.name));
for(const n of ["Box","Marker","Marker.tag","natMarker","boxMarker","getBoxTag","automaticBoxTag","Choose","Choose.choose","natChoose","pick","picked","pickedAgain","HasA","HasA.a","HasBoth","HasBoth.a","HasBoth.b","HasBoth.toHasA","natBoth","useA","inherited"]) assert.ok(names.has(n),`missing ${n}`);
assert.match(checked.typescript,/interface Marker<A>/);
assert.match(checked.typescript,/function boxMarker<A>\(m: Marker<A>\): Marker<Box<A>>/);
assert.match(checked.typescript,/interface Choose<A>/);
assert.match(checked.typescript,/return c\.choose\(x, y\)/);
assert.match(checked.typescript,/namespace HasBoth/);
assert.match(checked.typescript,/function toHasA<A>/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ps-p2-"));
try{
 const artifact=path.join(tmp,"p2.pscore.json"); fs.writeFileSync(artifact,JSON.stringify(checked.coreArtifact,null,2)+"\n");
 decodeArtifact(JSON.parse(fs.readFileSync(artifact,"utf8")));
 const replay=verifyFile(artifact,standardBootstrapAxiomSet()); assert.equal(replay.status,"accepted"); assert.equal(replay.projectPluginsLoaded,false);
 fs.writeFileSync(path.join(tmp,"p2.ts"),checked.typescript+'\nconsole.log("TAG="+automaticBoxTag());\nconsole.log("PICK="+picked());\nconsole.log("PICK2="+pickedAgain());\nconsole.log("INHERITED="+inherited());\n');
 fs.writeFileSync(path.join(tmp,"package.json"),'{"type":"module"}\n');
 const tsc=spawnSync("tsc",["p2.ts","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","--skipLibCheck","--outDir","js"],{cwd:tmp,encoding:"utf8"}); assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
 const runtime=spawnSync(process.execPath,[path.join(tmp,"js/p2.js")],{encoding:"utf8"}); assert.equal(runtime.status,0,runtime.stderr||runtime.stdout); assert.deepEqual(runtime.stdout.trim().split(/\r?\n/),["TAG=3","PICK=2","PICK2=7","INHERITED=4"]);
 const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
 if(leanBin){
   const ver=spawnSync(leanBin,["--version"],{encoding:"utf8"}); assert.equal(ver.status,0,ver.stderr||ver.stdout); assert.match(ver.stdout,/version 4\.33\.1,/); assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
   const stripped=stripStandardBootstrap(decodeArtifact(JSON.parse(fs.readFileSync(artifact,"utf8")))) ?? decodeArtifact(JSON.parse(fs.readFileSync(artifact,"utf8")));
   const leanPath=path.join(tmp,"p2.lean"); fs.writeFileSync(leanPath,`set_option linter.unusedVariables false\nset_option checkBinderAnnotations false\n${emitLeanArtifact(stripped)}\n#reduce automaticBoxTag\n#reduce picked\n#reduce pickedAgain\n#reduce inherited\n`);
   const lean=spawnSync(leanBin,[leanPath],{encoding:"utf8",env:{...process.env,TERM:"xterm"}}); assert.equal(lean.status,0,lean.stderr||lean.stdout);
   const clean=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,""); const obs=clean.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[0-9]+$/.test(x)); assert.deepEqual(obs.slice(-4),["3","2","7","4"]);
 }
 // Forge the chosen instance type while keeping its Choose constructor value.
 const tampered=structuredClone(checked.coreArtifact);
 const inst=tampered.declarations.find(d=>d.name==="natChoose"&&d.kind==="definition"); assert.ok(inst&&inst.kind==="definition");
 inst.type={tag:"app",fn:{tag:"const",name:"Marker",levels:[]},arg:{tag:"const",name:"Nat",levels:[]}};
 assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations,"KERNEL-level-instantiation-conformance1"), /type mismatch|expected|application/i);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log("✓ Production P2 generic classes: function methods + parameterized prerequisite instance + recursive search + inheritance + replay + exact Lean/TS + tamper rejection passed");
