import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkUnifiedSource,
  UNIFIED_INTEGRATION_PROFILE,
  WAVEB_NAT_DEC_EQ,
  WAVEB_NAT_DEC_LE,
  WAVEB_NAT_DEC_LT,
} from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-c/dependent-if.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVEC-dependent-if", "WAVED-decidable-transport", "WAVEE-decidable-synthesis", "WAVEF-hadd-dictionary", "WAVEG-add-dictionary", "WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

function findUserDef(name) {
  const d = checked.semanticIR.declarations.find(d => d.kind === "def" && d.name === name);
  assert.ok(d, `missing semantic IR def ${name}`);
  return d;
}

// Lean-compatible named-if scope: h : p in the true branch and h : Not p in the false branch.
for (const name of ["depEq", "depLe", "depLt"]) {
  const d = findUserDef(name);
  const ifExpr = d.body;
  assert.equal(ifExpr.kind, "extension");
  assert.equal(ifExpr.op, "lean.if");
  assert.equal(ifExpr.payload?.binderName, "h");
  const [condition, thenBranch, elseBranch] = ifExpr.args;
  assert.ok(condition && thenBranch && elseBranch);
  assert.equal(thenBranch.kind, "extension");
  assert.equal(thenBranch.op, "core.local.let");
  assert.equal(thenBranch.args[0]?.kind, "var");
  assert.equal(thenBranch.args[0]?.name, "h");
  assert.equal(thenBranch.args[0]?.type.form, "term");
  assert.deepEqual(thenBranch.args[0]?.type.term, condition);
  assert.equal(elseBranch.kind, "extension");
  assert.equal(elseBranch.op, "core.local.let");
  assert.equal(elseBranch.args[0]?.kind, "var");
  assert.equal(elseBranch.args[0]?.name, "h");
  assert.equal(elseBranch.args[0]?.type.form, "term");
  assert.equal(elseBranch.args[0]?.type.term?.kind, "op");
  assert.equal(elseBranch.args[0]?.type.term?.op, "lean.not");
  assert.deepEqual(elseBranch.args[0]?.type.term?.args?.[0], condition);
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
for (const name of ["depEq", "depLe", "depLt"]) {
  const decl = checked.coreArtifact.declarations.find(d => d.name === name);
  assert.ok(decl && "value" in decl, `missing Core def ${name}`);
  assert.ok(collectConsts(decl.value).includes("Decidable.rec"), `${name} must lower through checked Decidable.rec`);
}

// Proof copies must be fully erased from executable TypeScript.
assert.doesNotMatch(checked.typescript, /proofCopy/);
assert.doesNotMatch(checked.typescript, /\bh\b/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-c-"));
try {
  const artifactPath = path.join(outDir, "wave-c.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-c.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("EQ_T=" + depEq(2n, 2n).toString());
console.log("EQ_F=" + depEq(2n, 3n).toString());
console.log("LE_T=" + depLe(2n, 3n).toString());
console.log("LE_F=" + depLe(5n, 3n).toString());
console.log("LT_T=" + depLt(2n, 3n).toString());
console.log("LT_F=" + depLt(3n, 3n).toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-c.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-c.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), [
    "EQ_T=11", "EQ_F=22", "LE_T=31", "LE_F=32", "LT_T=41", "LT_F=42",
  ]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ["--version"], { encoding: "utf8" });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);

    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const builtinNames = new Set(["False", "True", "Not", "Decidable", "Nat.le", "Nat.lt"]);
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => !builtinNames.has(d.name)) };
    const leanPath = path.join(outDir, "wave-c.lean");
    const leanSource = `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `#reduce depEq 2 2\n#reduce depEq 2 3\n#reduce depLe 2 3\n#reduce depLe 5 3\n#reduce depLt 2 3\n#reduce depLt 3 3\n` +
      // Independently validate native Lean named-if binder scope in both branches.
      `example (a b : Nat) [Decidable (a = b)] : Nat := if h : a = b then (let _q : a = b := h; 1) else (let _q : Not (a = b) := h; 2)\n`;
    fs.writeFileSync(leanPath, leanSource);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^[0-9]+$/.test(x));
    assert.deepEqual(obs.slice(-6), ["11", "22", "31", "32", "41", "42"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Neighboring generic/non-Nat proposition condition remains outside Wave C.
assert.throws(
  () => checkUnifiedSource("def choose(a: Bool, b: Bool): Nat := { if h: (a = b) { let q := h; 1 } else { let q := h; 2 } }"),
  /Nat equality only|canonical Nat/,
);

console.log("✓ Wave C canonical Nat named proposition-if proof binders: true p / false Not p, checked Decidable.rec, proof erasure, replay, Lean and TS passed");
