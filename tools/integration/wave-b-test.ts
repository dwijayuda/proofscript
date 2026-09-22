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
  WAVEB_DECIDABLE,
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
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-b/decidable-control.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

for (const name of ["False", "True", "Not", WAVEB_DECIDABLE, WAVEB_NAT_DEC_EQ, WAVEB_NAT_DEC_LE, WAVEB_NAT_DEC_LT]) {
  assert.ok(checked.coreArtifact.declarations.some(d => d.name === name), `missing checked WaveB declaration ${name}`);
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
for (const name of ["minNat", "maxNat", "eqPick", "falseEq", "falseLe", "falseLt"]) {
  const decl = checked.coreArtifact.declarations.find(d => d.name === name);
  assert.ok(decl && "value" in decl, `missing ${name}`);
  const consts = collectConsts(decl.value);
  assert.ok(consts.includes("Decidable.rec"), `${name} must branch through proof-carrying Decidable.rec`);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-b-"));
try {
  const artifactPath = path.join(outDir, "wave-b.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-b.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("MIN_2_5=" + minNat(2n, 5n).toString());
console.log("MIN_7_3=" + minNat(7n, 3n).toString());
console.log("MAX_2_5=" + maxNat(2n, 5n).toString());
console.log("MAX_7_3=" + maxNat(7n, 3n).toString());
console.log("EQ_4_4=" + eqPick(4n, 4n).toString());
console.log("EQ_4_5=" + eqPick(4n, 5n).toString());
console.log("FALSE_EQ=" + falseEq().toString());
console.log("FALSE_LE=" + falseLe().toString());
console.log("FALSE_LT=" + falseLt().toString());
console.log("TRUE_EQ=" + trueEq().toString());
console.log("TRUE_LE=" + trueLe().toString());
console.log("TRUE_LT=" + trueLt().toString());
console.log("ANSWER=" + answer().toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-b.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-b.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), [
    "MIN_2_5=2", "MIN_7_3=3", "MAX_2_5=5", "MAX_7_3=7", "EQ_4_4=42", "EQ_4_5=0",
    "FALSE_EQ=4", "FALSE_LE=4", "FALSE_LT=4", "TRUE_EQ=7", "TRUE_LE=7", "TRUE_LT=7", "ANSWER=7",
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
    const leanPath = path.join(outDir, "wave-b.lean");
    const leanSource = `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `#reduce @Decidable.decide (2 = 2) (${WAVEB_NAT_DEC_EQ} 2 2)\n` +
      `#reduce @Decidable.decide (2 = 3) (${WAVEB_NAT_DEC_EQ} 2 3)\n` +
      `#reduce @Decidable.decide (2 <= 3) (${WAVEB_NAT_DEC_LE} 2 3)\n` +
      `#reduce @Decidable.decide (5 <= 3) (${WAVEB_NAT_DEC_LE} 5 3)\n` +
      `#reduce @Decidable.decide (2 < 3) (${WAVEB_NAT_DEC_LT} 2 3)\n` +
      `#reduce @Decidable.decide (3 < 3) (${WAVEB_NAT_DEC_LT} 3 3)\n` +
      `#reduce falseEq\n#reduce falseLe\n#reduce falseLt\n#reduce trueEq\n#reduce trueLe\n#reduce trueLt\n#reduce answer\n`;
    fs.writeFileSync(leanPath, leanSource);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^(true|false|Nat\.zero|[0-9]+)$/.test(x));
    assert.deepEqual(obs.slice(-13), ["true", "false", "true", "false", "true", "false", "4", "4", "4", "7", "7", "7", "7"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// WaveC exposes the branch proof binder using WaveB's already checked Decidable evidence.
const laterNamedIf = checkUnifiedSource("def choose(a: Nat, b: Nat): Nat := { if h: (a <= b) { a } else { b } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted");

// Frontend decision identity is still an untrusted hint: mismatched evidence is rejected before Core creation.
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

console.log("✓ Wave B proof-carrying Decidable foundation + Nat decEq/decLe/decLt + Decidable.rec proposition-if passed");
