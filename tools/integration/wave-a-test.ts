import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkUnifiedSource,
  lowerProgramToCore,
  UnifiedBridgeUnsupported,
  UNIFIED_INTEGRATION_PROFILE,
  WAVEA_NAT_BEQ,
  WAVEA_NAT_BLE,
  WAVEA_NAT_BLT,
  listUnifiedCoreLowerings,
} from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-a/control.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

for (const name of [WAVEA_NAT_BEQ, WAVEA_NAT_BLE, WAVEA_NAT_BLT]) {
  assert.equal(checked.coreArtifact.declarations.find(d => d.name === name)?.kind, "definition", `${name} must be checked Core library code`);
}
const descriptors = listUnifiedCoreLowerings();
for (const op of ["core.nat.add", "lean.hMul", "lean.hSub", "lean.le", "lean.lt", "proof.eq"]) {
  assert.ok(descriptors.some(d => d.semanticId === op), `registry missing ${op}`);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-a-"));
try {
  const artifactPath = path.join(outDir, "wave-a.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  assert.equal(verifyFile(artifactPath, standardBootstrapAxiomSet()).status, "accepted");

  const tsPath = path.join(outDir, "wave-a.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("MIN_2_5=" + minNat(2n, 5n).toString());
console.log("MIN_7_3=" + minNat(7n, 3n).toString());
console.log("MAX_2_5=" + maxNat(2n, 5n).toString());
console.log("MAX_7_3=" + maxNat(7n, 3n).toString());
console.log("EQ_4_4=" + eqPick(4n, 4n).toString());
console.log("EQ_4_5=" + eqPick(4n, 5n).toString());
console.log("CTRL_8_18=" + arithmeticControl(8n, 18n).toString());
console.log("CTRL_5_20=" + arithmeticControl(5n, 20n).toString());
console.log("ANSWER=" + answer().toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-a.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-a.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  const tsObs = runtime.stdout.trim().split(/\r?\n/);
  assert.deepEqual(tsObs, [
    "MIN_2_5=2", "MIN_7_3=3", "MAX_2_5=5", "MAX_7_3=7", "EQ_4_4=42", "EQ_4_5=0", "CTRL_8_18=6", "CTRL_5_20=5", "ANSWER=6",
  ]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin && checked.integrationProfile === "WAVEA-control-core") {
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => d.name !== "Nat.le" && d.name !== "Nat.lt") };
    const leanPath = path.join(outDir, "wave-a.lean");
    const leanSource = `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `theorem wavea_beq_eq_nat_beq (a b : Nat) : ${WAVEA_NAT_BEQ} a b = Nat.beq a b := by\n` +
      `  induction a generalizing b with\n` +
      `  | zero => cases b <;> rfl\n` +
      `  | succ a ih => cases b with\n` +
      `    | zero => rfl\n` +
      `    | succ b => exact ih b\n\n` +
      `theorem wavea_ble_eq_nat_ble (a b : Nat) : ${WAVEA_NAT_BLE} a b = Nat.ble a b := by\n` +
      `  induction a generalizing b with\n` +
      `  | zero => cases b <;> rfl\n` +
      `  | succ a ih => cases b with\n` +
      `    | zero => rfl\n` +
      `    | succ b => exact ih b\n\n` +
      `theorem wavea_blt_eq_nat_blt (a b : Nat) : ${WAVEA_NAT_BLT} a b = Nat.ble (Nat.succ a) b := by\n` +
      `  exact wavea_ble_eq_nat_ble (Nat.succ a) b\n\n` +
      `#reduce minNat 2 5\n#reduce minNat 7 3\n#reduce maxNat 2 5\n#reduce maxNat 7 3\n#reduce eqPick 4 4\n#reduce eqPick 4 5\n#reduce arithmeticControl 8 18\n#reduce arithmeticControl 5 20\n#reduce answer\n`;
    fs.writeFileSync(leanPath, leanSource);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^(Nat\.zero|[0-9]+)$/.test(x)).slice(-9);
    assert.deepEqual(obs, ["2", "3", "5", "7", "42", "Nat.zero", "6", "5", "6"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// WaveC adds named proof binders on top of WaveA without changing WaveA's accepted semantics.
const laterNamedIf = checkUnifiedSource("def choose(a: Nat, b: Nat): Nat := { if h: (a <= b) { a } else { b } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted");

// Tampered decision evidence must not be accepted as the canonical relation decision.
const tampered = structuredClone(checked.semanticIR);
let changed = false;
function visit(expr) {
  if (!expr || typeof expr !== "object") return;
  if (expr.kind === "extension" && expr.op === "lean.if" && expr.args?.[0]?.op === "lean.le" && expr.args?.[3]?.kind === "call") {
    expr.args[3] = { ...expr.args[3], callee: "__psDecidableLTNat" };
    changed = true;
    return;
  }
  if (Array.isArray(expr.args)) for (const a of expr.args) visit(a);
}
for (const d of tampered.declarations) if (d.kind === "def") visit(d.body);
assert.equal(changed, true);
assert.throws(
  () => lowerProgramToCore(tampered),
  e => e instanceof UnifiedBridgeUnsupported && /matching canonical DecidableLE Nat evidence/.test(e.message),
);

assert.throws(
  () => checkUnifiedSource("def bad: Nat := { if (2 <= 3) { 41 } else { 0 } }\ntheorem nope: bad = 42 := by { rfl }"),
  e => e instanceof Error && /standalone kernel rejected/.test(e.message),
);

console.log("✓ Wave A canonical Nat proposition-if + checked comparison models + declarative lowering registry passed");
