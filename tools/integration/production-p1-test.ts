import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkCoreDeclarations } from "@proofscript/kernel";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { checkSource } from "@proofscript/frontend-next";
import { checkUnifiedSource, createUnifiedRegistry, lowerProgramToCore, UnifiedBridgeUnsupported, UNIFIED_INTEGRATION_PROFILE } from "@proofscript/unified-bridge";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/production-p1/data-control.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.ok(["PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

const names = new Set(checked.coreArtifact.declarations.map(d => d.name));
for (const name of ["NatResult","Box","Point","Point.x","Point.y","NatList","sum","Cell","Cell.value","readCell","PList","length","Pair","Pair.first","Pair.second","appendP","mapP","resultOk","resultBox","resultPoint","resultSum","resultCell","resultLength","resultPairFirst","resultPairSecond","resultAppendLength","resultMappedHead"]) assert.ok(names.has(name), `missing checked Core declaration ${name}`);
const sum = checked.coreArtifact.declarations.find(d => d.name === "sum" && d.kind === "definition");
assert.ok(sum && "value" in sum);
const pointX = checked.coreArtifact.declarations.find(d => d.name === "Point.x" && d.kind === "definition");
assert.ok(pointX && "value" in pointX);

function collectConsts(term, out = []) {
  if (!term || typeof term !== "object") return out;
  if (term.tag === "const") out.push(term.name);
  if (term.tag === "app") { collectConsts(term.fn,out); collectConsts(term.arg,out); }
  else if (term.tag === "lam" || term.tag === "pi") { collectConsts(term.domain,out); collectConsts(term.body,out); }
  else if (term.tag === "let") { collectConsts(term.type,out); collectConsts(term.value,out); collectConsts(term.body,out); }
  else if (term.tag === "proj") collectConsts(term.expr,out);
  return out;
}
assert.ok(collectConsts(sum.value).includes("NatList.rec"), "structural recursion must lower through the checked generated recursor");
assert.ok(collectConsts(pointX.value).includes("Point.rec"), "structure projection must be a checked recursor-derived definition");
assert.match(checked.typescript,/tag: "mk", value: 1n/);
assert.match(checked.typescript,/return p\.x/);
assert.match(checked.typescript,/head: 1n/);
assert.match(checked.typescript,/interface Cell<A>/);
assert.match(checked.typescript,/function length<A>\(xs: PList<A>\): bigint/);
assert.match(checked.typescript,/interface Pair<A>/);
assert.match(checked.typescript,/function appendP<A>\(xs: PList<A>, ys: PList<A>\): PList<A>/);
assert.match(checked.typescript,/function mapP<A, B>\(f: \(arg: A\) => B, xs: PList<A>\): PList<B>/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-production-p1-"));
try {
  const artifactPath = path.join(outDir, "production-p1.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact,null,2)+"\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath,"utf8")));
  const replay = verifyFile(artifactPath,standardBootstrapAxiomSet());
  assert.equal(replay.status,"accepted");
  assert.equal(replay.projectPluginsLoaded,false);

  fs.writeFileSync(path.join(outDir,"p1.ts"), checked.typescript + `\nconsole.log("OK="+resultOk());\nconsole.log("BOX="+resultBox());\nconsole.log("POINT="+resultPoint());\nconsole.log("SUM="+resultSum());\nconsole.log("CELL="+resultCell());\nconsole.log("LENGTH="+resultLength());\nconsole.log("PAIR1="+resultPairFirst());\nconsole.log("PAIR2="+resultPairSecond());\nconsole.log("APPENDLEN="+resultAppendLength());\nconsole.log("MAPHEAD="+resultMappedHead());\n`);
  fs.writeFileSync(path.join(outDir,"package.json"),'{"type":"module"}\n');
  const tsc=spawnSync("tsc",["p1.ts","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext","--skipLibCheck","--outDir","js"],{cwd:outDir,encoding:"utf8"});
  assert.equal(tsc.status,0,tsc.stderr||tsc.stdout);
  const runtime=spawnSync(process.execPath,[path.join(outDir,"js/p1.js")],{encoding:"utf8"});
  assert.equal(runtime.status,0,runtime.stderr||runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/),["OK=9","BOX=1","POINT=3","SUM=6","CELL=5","LENGTH=3","PAIR1=4","PAIR2=9","APPENDLEN=5","MAPHEAD=11"]);

  const leanBin=process.env.PROOFSCRIPT_LEAN_BIN;
  if(leanBin){
    const ver=spawnSync(leanBin,["--version"],{encoding:"utf8"});
    assert.equal(ver.status,0,ver.stderr||ver.stdout);
    assert.match(ver.stdout,/version 4\.33\.1,/);
    assert.match(ver.stdout,/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped=stripStandardBootstrap(decoded)??decoded;
    const leanPath=path.join(outDir,"p1.lean");
    fs.writeFileSync(leanPath,`set_option linter.unusedVariables false\n${emitLeanArtifact(stripped)}\n#reduce resultOk\n#reduce resultBox\n#reduce resultPoint\n#reduce resultSum\n#reduce resultCell\n#reduce resultLength\n#reduce resultPairFirst\n#reduce resultPairSecond\n#reduce resultAppendLength\n#reduce resultMappedHead\n`);
    const lean=spawnSync(leanBin,[leanPath],{encoding:"utf8",env:{...process.env,TERM:"xterm"}});
    assert.equal(lean.status,0,lean.stderr||lean.stdout);
    const clean=lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g,"");
    const observations=clean.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[0-9]+$/.test(x));
    assert.deepEqual(observations.slice(-10),["9","1","3","6","5","3","4","9","5","11"]);
  }

  // Adversarial artifact: forge NatResult.ok to consume Bool while existing
  // checked user definitions still apply it to Nat. The frozen kernel, not the
  // bridge metadata, must reject the inconsistency.
  const tampered=structuredClone(checked.coreArtifact);
  const natResult=tampered.declarations.find(d=>d.name==="NatResult"&&d.kind==="inductive");
  assert.ok(natResult && natResult.kind==="inductive");
  const okCtor=natResult.constructors.find(c=>c.name==="NatResult.ok");
  assert.ok(okCtor && okCtor.type.tag==="pi");
  okCtor.type={...okCtor.type,domain:{tag:"const",name:"Bool",levels:[]}};
  assertCoreDeclarationsRejected(checkCoreDeclarations(tampered.declarations,"KERNEL-level-instantiation-conformance1"), /type mismatch|application|expected/i);
} finally { fs.rmSync(outDir,{recursive:true,force:true}); }

// P1 scope is still intentionally fail-closed outside this first broad cut.
const indexed=`inductive Vec(A: Type): (n: Nat) -> Type { | nil: Vec(A,0); }`;
assert.throws(()=>lowerProgramToCore(checkSource(indexed,createUnifiedRegistry()).program),e=>e instanceof UnifiedBridgeUnsupported && /non-indexed|indexed/.test(e.message));

// Multi-parameter recursion is accepted only when the non-structural runtime
// parameters are preserved.  The recursor IH represents append(tail, ys) for
// the fixed outer ys; silently reusing it for append(tail, nil) would be an
// unsound lowering, so the bridge must fail closed.
const changedOuter=`
inductive L { | nil; | cons(head: Nat, tail: L); }
def bad(xs: L, ys: L): L := {
  match (xs) {
    | .nil => ys
    | .cons(head, tail) => L.cons(head, bad(tail, L.nil))
  }
}`;
assert.throws(
  ()=>lowerProgramToCore(checkSource(changedOuter,createUnifiedRegistry()).program),
  e=>e instanceof UnifiedBridgeUnsupported && /preserve non-structural parameter 'ys'/.test(e.message),
);

console.log("✓ Production P1 data/control: generic ADTs/records + update + exhaustive match + multi-parameter/higher-order structural recursion + replay + exact Lean/TS + tamper rejection passed");
