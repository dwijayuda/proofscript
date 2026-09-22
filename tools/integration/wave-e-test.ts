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
  WAVEB_NAT_DEC_EQ,
  WAVEB_NAT_DEC_LE,
  WAVEB_NAT_DEC_LT,
} from "@proofscript/unified-bridge";
import { checkSource } from "@proofscript/frontend-next";
import { checkCoreDeclarations } from "@proofscript/kernel";
import { decodeArtifact, makeKernelResourceBoundsArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { loadStandardBootstrap, stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-e/decidable-synthesis.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVEE-decidable-synthesis", "WAVEF-hadd-dictionary", "WAVEG-add-dictionary", "WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

const expectedEvidence = new Map([
  ["eqTrue", "__psDecidableEqNat"],
  ["eqFalse", "__psDecidableEqNat"],
  ["leTrue", "__psDecidableLENat"],
  ["leFalse", "__psDecidableLENat"],
  ["ltTrue", "__psDecidableLTNat"],
  ["ltFalse", "__psDecidableLTNat"],
  ["forwardEqTrue", "__psDecidableEqNat"],
  ["forwardLeFalse", "__psDecidableLENat"],
]);
for (const [name, evidenceName] of expectedEvidence) {
  const d = checked.semanticIR.declarations.find(x => x.kind === "def" && x.name === name);
  assert.ok(d && d.kind === "def", `missing IR def ${name}`);
  assert.equal(d.body.kind, "call", `${name} should be a generic call`);
  const evidence = d.body.args[1];
  assert.ok(evidence && evidence.kind === "call", `${name} missing synthesized Decidable evidence`);
  assert.equal(evidence.callee, evidenceName, `${name} chose the wrong Decidable dictionary`);
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
for (const [name, coreEvidence] of [
  ["eqTrue", WAVEB_NAT_DEC_EQ],
  ["eqFalse", WAVEB_NAT_DEC_EQ],
  ["leTrue", WAVEB_NAT_DEC_LE],
  ["leFalse", WAVEB_NAT_DEC_LE],
  ["ltTrue", WAVEB_NAT_DEC_LT],
  ["ltFalse", WAVEB_NAT_DEC_LT],
  ["forwardEqTrue", WAVEB_NAT_DEC_EQ],
  ["forwardLeFalse", WAVEB_NAT_DEC_LE],
]) {
  const d = checked.coreArtifact.declarations.find(x => x.name === name);
  assert.ok(d && "value" in d, `missing Core def ${name}`);
  assert.ok(collectConsts(d.value).includes(coreEvidence), `${name} does not contain ${coreEvidence}`);
}

assert.match(checked.typescript, /__psDecidableEqNat\(2n, 2n\)/);
assert.match(checked.typescript, /__psDecidableLENat\(2n, 3n\)/);
assert.match(checked.typescript, /__psDecidableLTNat\(2n, 3n\)/);
assert.match(checked.typescript, /function choose\(d: ProofScriptDecidable, x: bigint, y: bigint\)/);
assert.doesNotMatch(checked.typescript, /function choose\(P/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-e-"));
try {
  const artifactPath = path.join(outDir, "wave-e.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-e.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("EQ_T=" + eqTrue().toString());
console.log("EQ_F=" + eqFalse().toString());
console.log("LE_T=" + leTrue().toString());
console.log("LE_F=" + leFalse().toString());
console.log("LT_T=" + ltTrue().toString());
console.log("LT_F=" + ltFalse().toString());
console.log("F_EQ_T=" + forwardEqTrue().toString());
console.log("F_LE_F=" + forwardLeFalse().toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-e.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-e.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), [
    "EQ_T=11", "EQ_F=22", "LE_T=11", "LE_F=22", "LT_T=11", "LT_F=22", "F_EQ_T=31", "F_LE_F=32",
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
    const leanPath = path.join(outDir, "wave-e.lean");
    fs.writeFileSync(leanPath, `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `#reduce eqTrue\n#reduce eqFalse\n#reduce leTrue\n#reduce leFalse\n#reduce ltTrue\n#reduce ltFalse\n#reduce forwardEqTrue\n#reduce forwardLeFalse\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^[0-9]+$/.test(x));
    assert.deepEqual(obs.slice(-8), ["11", "22", "11", "22", "11", "22", "31", "32"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Adversarial evidence identity: keep the forged IR type annotation as Decidable(2 = 2)
// but swap the actual synthesized dictionary call to Nat.decLt. The bridge translates
// the callee identity, and the standalone kernel must reject the resulting type mismatch.
const parsed = checkSource(source, createUnifiedRegistry()).program;
const attacked = structuredClone(parsed);
const eqTrue = attacked.declarations.find(x => x.kind === "def" && x.name === "eqTrue");
assert.ok(eqTrue && eqTrue.kind === "def" && eqTrue.body.kind === "call");
const forgedEvidence = eqTrue.body.args[1];
assert.ok(forgedEvidence && forgedEvidence.kind === "call");
assert.equal(forgedEvidence.callee, "__psDecidableEqNat");
forgedEvidence.callee = "__psDecidableLTNat";
const standard = loadStandardBootstrap().artifact;
const attackedArtifact = makeKernelResourceBoundsArtifact(
  [...standard.declarations, ...lowerProgramToCore(attacked)],
  standard.typeclasses,
);
const attackedSummary = checkCoreDeclarations(attackedArtifact.declarations, "KERNEL-level-instantiation-conformance1");
assert.equal(attackedSummary.status, "rejected");
assert.match(attackedSummary.message ?? "", /type mismatch/);

// WaveE intentionally synthesizes only canonical Nat equality/order decisions.
assert.throws(
  () => checkUnifiedSource(`
def choose(P: Prop)[d: Decidable(P)](x: Nat, y: Nat): Nat := { if (P) { x } else { y } }
def boolDecision(a: Bool, b: Bool): Nat := { choose((a = b), 1, 2) }
`),
  /Failed to synthesize instance.*Decidable|Could not synthesize.*Decidable/,
);

console.log("✓ Wave E canonical Nat Decidable synthesis into generic calls + Core Nat.dec* mapping + replay + exact Lean + TS correspondence + tamper rejection passed");
