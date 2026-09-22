import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkSource } from "@proofscript/frontend-next";
import { decodeArtifact, makeKernelResourceBoundsArtifact } from "@proofscript/kernel-codec";
import { checkCoreDeclarations } from "@proofscript/kernel";
import { verifyFile } from "@proofscript/verifier";
import {
  checkUnifiedSource,
  createUnifiedRegistry,
  lowerProgramToCore,
  UnifiedBridgeUnsupported,
  UNIFIED_INTEGRATION_PROFILE,
  WAVEF_HADD,
  WAVEF_HADD_FIELD,
  WAVEG_ADD,
  WAVEG_ADD_FIELD,
} from "@proofscript/unified-bridge";
import { loadStandardBootstrap, stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-g/add-dictionary.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVEG-add-dictionary", "WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

function collectConsts(term, out = []) {
  if (!term || typeof term !== "object") return out;
  if (term.tag === "const") out.push(term.name);
  if (term.tag === "app") { collectConsts(term.fn, out); collectConsts(term.arg, out); }
  else if (term.tag === "lam" || term.tag === "pi") { collectConsts(term.domain, out); collectConsts(term.body, out); }
  else if (term.tag === "let") { collectConsts(term.type, out); collectConsts(term.value, out); collectConsts(term.body, out); }
  else if (term.tag === "proj") collectConsts(term.expr, out);
  return out;
}

assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEG_ADD && d.kind === "inductive"));
assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEG_ADD_FIELD && d.kind === "definition"));
assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEF_HADD && d.kind === "inductive"));
assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEF_HADD_FIELD && d.kind === "definition"));

const plusCore = checked.coreArtifact.declarations.find(d => d.name === "plus" && "value" in d);
assert.ok(plusCore && "value" in plusCore);
const plusConsts = collectConsts(plusCore.value);
assert.ok(plusConsts.includes(WAVEG_ADD_FIELD), "plus must derive HAdd through checked Add.add");
assert.ok(plusConsts.includes("HAdd.mk"), "plus must construct HAdd from Add dictionary");
assert.ok(plusConsts.includes(WAVEF_HADD_FIELD), "plus must apply checked HAdd.hAdd projection");
for (const name of ["result", "doubled"]) {
  const d = checked.coreArtifact.declarations.find(x => x.name === name && "value" in x);
  assert.ok(d && "value" in d);
  const cs = collectConsts(d.value);
  assert.ok(cs.includes("Add.mk"), `${name} must explicitly construct Add Nat dictionary`);
  assert.ok(cs.includes("Nat.add"), `${name} Add dictionary must carry Nat.add`);
}

assert.match(checked.typescript, /interface Add<A>/);
assert.match(checked.typescript, /function plus<A>\(a: Add<A>, x: A, y: A\)/);
assert.match(checked.typescript, /return __psInstHAdd\(a\)\.hAdd\(x, y\)/);
assert.match(checked.typescript, /plus\(__psInstAddNat, 2n, 3n\)/);
assert.match(checked.typescript, /twice\(__psInstAddNat, 4n\)/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-g-"));
try {
  const artifactPath = path.join(outDir, "wave-g.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-g.ts");
  fs.writeFileSync(tsPath, checked.typescript + `\nconsole.log("RESULT=" + result().toString());\nconsole.log("DOUBLED=" + doubled().toString());\n`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-g.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-g.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), ["RESULT=5", "DOUBLED=8"]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ["--version"], { encoding: "utf8" });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const localClasses = new Set([WAVEG_ADD, WAVEG_ADD_FIELD, WAVEF_HADD, WAVEF_HADD_FIELD]);
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => !localClasses.has(d.name)) };
    const leanPath = path.join(outDir, "wave-g.lean");
    fs.writeFileSync(leanPath, `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n#reduce result\n#reduce doubled\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^[0-9]+$/.test(x));
    assert.deepEqual(obs.slice(-2), ["5", "8"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Bridge attack: forge the concrete Add dictionary identity at a Nat call.
const parsed = checkSource(source, createUnifiedRegistry()).program;
const attacked = structuredClone(parsed);
const resultIr = attacked.declarations.find(x => x.kind === "def" && x.name === "result");
assert.ok(resultIr && resultIr.kind === "def" && resultIr.body.kind === "call");
const checkedArgs = resultIr.body.checkedArgs ?? resultIr.body.args;
const addDict = checkedArgs[1];
assert.ok(addDict && addDict.kind === "var" && addDict.name === "__psInstAddNat");
addDict.name = "__psInstAddBogus";
assert.throws(
  () => lowerProgramToCore(attacked),
  e => e instanceof UnifiedBridgeUnsupported && /(unknown|unresolved)/.test(e.message.toLowerCase()),
);

// Kernel attack: replace Nat.add inside the checked Add Nat constructor with Nat.succ.
const standard = loadStandardBootstrap().artifact;
const owned = lowerProgramToCore(parsed);
const malformed = structuredClone(owned);
const target = malformed.find(d => d.name === "result" && "value" in d);
assert.ok(target && "value" in target);
function replaceNatAdd(term) {
  if (term.tag === "const" && term.name === "Nat.add") return { tag: "const", name: "Nat.succ", levels: [] };
  if (term.tag === "app") return { ...term, fn: replaceNatAdd(term.fn), arg: replaceNatAdd(term.arg) };
  if (term.tag === "lam" || term.tag === "pi") return { ...term, domain: replaceNatAdd(term.domain), body: replaceNatAdd(term.body) };
  if (term.tag === "let") return { ...term, type: replaceNatAdd(term.type), value: replaceNatAdd(term.value), body: replaceNatAdd(term.body) };
  if (term.tag === "proj") return { ...term, expr: replaceNatAdd(term.expr) };
  return term;
}
target.value = replaceNatAdd(target.value);
const attackedArtifact = makeKernelResourceBoundsArtifact([...standard.declarations, ...malformed], standard.typeclasses);
assertCoreDeclarationsRejected(checkCoreDeclarations(attackedArtifact.declarations, "KERNEL-level-instantiation-conformance1"), /type mismatch/);

console.log("✓ Wave G checked Add(A) dictionary → checked HAdd(A,A,A) construction + forwarding + replay + exact Lean + TS + attacks passed");
