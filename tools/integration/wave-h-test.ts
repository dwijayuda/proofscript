import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkSource } from "@proofscript/frontend-next";
import { decodeArtifact } from "@proofscript/kernel-codec";
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
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-h/user-add-instance.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
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

const instanceCore = checked.coreArtifact.declarations.find(d => d.name === "weirdAdd" && d.kind === "definition");
assert.ok(instanceCore && "value" in instanceCore);
assert.ok(collectConsts(instanceCore.value).includes("Add.mk"));
const resultCore = checked.coreArtifact.declarations.find(d => d.name === "result" && d.kind === "definition");
assert.ok(resultCore && "value" in resultCore);
const resultConsts = collectConsts(resultCore.value);
assert.ok(resultConsts.includes("weirdAdd"), "checked Core must preserve selected user instance identity");
assert.ok(resultConsts.includes(WAVEG_ADD_FIELD), "checked HAdd adapter must project Add.add from user dictionary");
assert.ok(resultConsts.includes(WAVEF_HADD_FIELD), "checked runtime operation must consume HAdd.hAdd");

assert.match(checked.typescript, /export const weirdAdd: Add<bigint> = \{ add:/);
assert.match(checked.typescript, /return __psInstHAdd\(weirdAdd\)\.hAdd\(2n, 3n\)/);
assert.match(checked.typescript, /return __psInstHAdd\(weirdAdd\)\.hAdd\(x, y\)/);
assert.doesNotMatch(checked.typescript, /function result\(\): bigint \{\s*return \(2n \+ 3n\)/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-h-"));
try {
  const artifactPath = path.join(outDir, "wave-h.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  fs.writeFileSync(path.join(outDir, "wave-h.ts"), checked.typescript + `\nconsole.log("RESULT=" + result().toString());\nconsole.log("AGAIN=" + resultAgain().toString());\n`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-h.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-h.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), ["RESULT=2", "AGAIN=7"]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ["--version"], { encoding: "utf8" });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const localClasses = new Set([WAVEG_ADD, WAVEG_ADD_FIELD, WAVEF_HADD, WAVEF_HADD_FIELD]);
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => !localClasses.has(d.name)) };
    const leanPath = path.join(outDir, "wave-h.lean");
    fs.writeFileSync(leanPath, `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n#reduce result\n#reduce resultAgain\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^[0-9]+$/.test(x));
    assert.deepEqual(obs.slice(-2), ["2", "7"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Scope boundary: parameterized user Add instances remain outside WaveH.
const genericInstanceSource = `instance firstAdd {A: Type}: Add(A) := { add := fun (x: A) (y: A) => x };\ndef n: Nat := { 1 + 2 }`;
const genericIr = checkSource(genericInstanceSource, createUnifiedRegistry()).program;
assert.throws(
  () => lowerProgramToCore(genericIr),
  e => e instanceof UnifiedBridgeUnsupported && /does not yet support instance parameters/.test(e.message),
);

console.log("✓ Wave H user-defined global Add(Nat) instance → checked Core dictionary + selected-evidence Lean/TS correspondence + replay + bounded rejection passed");
