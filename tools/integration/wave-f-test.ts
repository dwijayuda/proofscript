import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkUnifiedSource,
  createUnifiedRegistry,
  lowerProgramToCore,
  UNIFIED_INTEGRATION_PROFILE,
  UnifiedBridgeUnsupported,
  WAVEF_HADD,
  WAVEF_HADD_FIELD,
  WAVEG_ADD,
  WAVEG_ADD_FIELD,
} from "@proofscript/unified-bridge";
import { checkSource } from "@proofscript/frontend-next";
import { checkCoreDeclarations } from "@proofscript/kernel";
import { decodeArtifact, makeKernelResourceBoundsArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { loadStandardBootstrap, stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-f/hadd-dictionary.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVEF-hadd-dictionary", "WAVEG-add-dictionary", "WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

// Historical frontend/backend args remain stable, while checkedArgs retains
// the full dependent spine needed by raw Core (including inferred A := Nat).
for (const name of ["result", "doubled"]) {
  const d = checked.semanticIR.declarations.find(x => x.kind === "def" && x.name === name);
  assert.ok(d && d.kind === "def" && d.body.kind === "call", `missing call body ${name}`);
  assert.ok(d.body.checkedArgs, `${name} must retain a checked dependent argument spine`);
  assert.equal(d.body.checkedArgs[0]?.kind, "type", `${name} checked spine must begin with inferred type argument`);
  assert.equal(d.body.checkedArgs[0]?.value.id, "Nat");
  assert.notEqual(d.body.args[0]?.kind, "type", `${name} ordinary backend args must remain historically stable`);
  const dictionary = d.body.checkedArgs[1];
  assert.ok(dictionary && dictionary.kind === "call", `${name} checked spine missing HAdd dictionary`);
  assert.equal(dictionary.callee, "__psInstHAdd");
}

function collectConsts(term, out = []) {
  if (!term || typeof term !== "object") return out;
  if (term.tag === "const") out.push(term.name);
  if (term.tag === "app") { collectConsts(term.fn, out); collectConsts(term.arg, out); }
  else if (term.tag === "lam" || term.tag === "pi") { collectConsts(term.domain, out); collectConsts(term.body, out); }
  else if (term.tag === "let") { collectConsts(term.type, out); collectConsts(term.value, out); collectConsts(term.body, out); }
  else if (term.tag === "proj") collectConsts(term.expr, out);
  return out;
}
const genericCore = checked.coreArtifact.declarations.find(x => x.name === "generic");
assert.ok(genericCore && "value" in genericCore);
assert.ok(collectConsts(genericCore.value).includes(WAVEF_HADD_FIELD), "generic must apply checked HAdd.hAdd projection");
for (const name of ["result", "doubled"]) {
  const d = checked.coreArtifact.declarations.find(x => x.name === name);
  assert.ok(d && "value" in d);
  const cs = collectConsts(d.value);
  assert.ok(cs.includes("HAdd.mk"), `${name} must explicitly construct HAdd dictionary`);
  assert.ok(cs.includes("Nat.add"), `${name} dictionary must carry Nat.add`);
}
assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEF_HADD && d.kind === "inductive"));
assert.ok(checked.coreArtifact.declarations.some(d => d.name === WAVEF_HADD_FIELD && d.kind === "definition"));

assert.match(checked.typescript, /interface HAdd<A, B, C>/);
assert.match(checked.typescript, /function generic<A>\(h: HAdd<A, A, A>, x: A, y: A\)/);
assert.match(checked.typescript, /return h\.hAdd\(x, y\)/);
assert.match(checked.typescript, /generic\(__psInstHAdd\(__psInstAddNat\), 2n, 3n\)/);
assert.match(checked.typescript, /twice\(__psInstHAdd\(__psInstAddNat\), 4n\)/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-f-"));
try {
  const artifactPath = path.join(outDir, "wave-f.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-f.ts");
  fs.writeFileSync(tsPath, checked.typescript + `\nconsole.log("RESULT=" + result().toString());\nconsole.log("DOUBLED=" + doubled().toString());\n`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-f.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-f.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), ["RESULT=5", "DOUBLED=8"]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ["--version"], { encoding: "utf8" });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    // The restricted local class has the exact native HAdd shape needed by this
    // slice. Remove only those helper declarations so user Core is checked by
    // the pinned native Lean HAdd/HAdd.hAdd oracle.
    const localClassHelpers = new Set([WAVEF_HADD, WAVEF_HADD_FIELD, WAVEG_ADD, WAVEG_ADD_FIELD]);
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => !localClassHelpers.has(d.name)) };
    const leanPath = path.join(outDir, "wave-f.lean");
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

// Bridge-level forged canonical dictionary: keep HAdd Nat Nat Nat as the IR
// result type but swap its actual base dictionary from Add Nat to Add Int.
// The bridge must reject this before Core admission rather than trusting the
// annotation on __psInstHAdd.
const parsed = checkSource(source, createUnifiedRegistry()).program;
const attacked = structuredClone(parsed);
const resultIr = attacked.declarations.find(x => x.kind === "def" && x.name === "result");
assert.ok(resultIr && resultIr.kind === "def" && resultIr.body.kind === "call");
const dict = resultIr.body.args[0];
assert.ok(dict && dict.kind === "call" && dict.callee === "__psInstHAdd");
const base = dict.args[1];
assert.ok(base && base.kind === "var" && base.name === "__psInstAddNat");
base.name = "__psInstAddBogus";
assert.throws(
  () => lowerProgramToCore(attacked),
  e => e instanceof UnifiedBridgeUnsupported && /(canonical HAdd Nat Nat Nat|unresolved|unknown)/i.test(e.message),
);

// Stronger independent-kernel check: construct a malformed HAdd Nat dictionary
// whose field is Bool-valued. Even if inserted after the untrusted bridge, v68
// must reject the constructor field type.
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

console.log("✓ Wave F Type-0 HAdd dictionary value + inferred type-argument preservation + checked projection + Nat construction + replay + exact Lean + TS + tamper rejection passed");
