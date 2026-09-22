import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  checkUnifiedSource,
  UnifiedBridgeUnsupported,
  UNIFIED_INTEGRATION_PROFILE,
  UI2_INTERNAL_NAT_MUL,
} from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/ui2/nat-mul.ps"), "utf8");
const checked = checkUnifiedSource(source);

assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assert.equal(checked.coreArtifact.formatVersion, 71);
assert.equal(checked.coreArtifact.implementationProfile, "KERNEL-level-instantiation-conformance1");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.match(checked.sourceSha256, /^[0-9a-f]{64}$/);
assert.match(checked.semanticIrSha256, /^[0-9a-f]{64}$/);
assert.match(checked.coreSha256, /^[0-9a-f]{64}$/);

const helper = checked.coreArtifact.declarations.find(d => d.name === UI2_INTERNAL_NAT_MUL);
assert.ok(helper, "UI2 must insert the checked Nat.mul logical-model helper when multiplication is used");
assert.equal(helper.kind, "definition");

function visitTerm(term, f) {
  f(term);
  if (term.tag === "app") { visitTerm(term.fn, f); visitTerm(term.arg, f); }
  else if (term.tag === "lam" || term.tag === "pi") { visitTerm(term.domain, f); visitTerm(term.body, f); }
  else if (term.tag === "let") { visitTerm(term.type, f); visitTerm(term.value, f); visitTerm(term.body, f); }
  else if (term.tag === "proj") visitTerm(term.expr, f);
}
let helperSawNatRec = false;
let helperSawNatAdd = false;
visitTerm(helper.value, term => {
  if (term.tag === "const" && term.name === "Nat.rec") helperSawNatRec = true;
  if (term.tag === "const" && term.name === "Nat.add") helperSawNatAdd = true;
});
assert.equal(helperSawNatRec, true, "UI2 Nat.mul helper must be expressed through the trusted Nat recursor");
assert.equal(helperSawNatAdd, true, "UI2 Nat.mul helper must use checked Nat.add in the successor case");

const userCore = checked.coreArtifact.declarations.filter(d => !d.name.startsWith("ProofScript.Internal.UI2."));
let sawInternalMulReference = false;
for (const declaration of userCore) {
  for (const key of ["type", "value"]) {
    const term = declaration[key];
    if (!term) continue;
    visitTerm(term, node => {
      if (node.tag === "const" && node.name === UI2_INTERNAL_NAT_MUL) sawInternalMulReference = true;
    });
  }
}
assert.equal(sawInternalMulReference, true, "canonical HMul Nat Nat Nat must lower to the checked UI2 Core helper");

const noMul = checkUnifiedSource("def one: Nat := { 1 }");
assert.equal(noMul.coreArtifact.declarations.some(d => d.name === UI2_INTERNAL_NAT_MUL), false, "UI2 helper must be inserted only when required");

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ui2-"));
try {
  const artifactPath = path.join(outDir, "nat-mul.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  assert.equal(decoded.formatVersion, 71);
  assert.equal(verifyFile(artifactPath, standardBootstrapAxiomSet()).status, "accepted");

  const tsPath = path.join(outDir, "nat-mul.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("UI2_DOUBLE=" + double(7n).toString());
console.log("UI2_PRODUCT=" + product(6n, 7n).toString());
console.log("UI2_MIXED=" + mixed(2n, 3n).toString());
console.log("UI2_CHOOSE_TRUE=" + chooseScaled(true, 5n).toString());
console.log("UI2_CHOOSE_FALSE=" + chooseScaled(false, 5n).toString());
console.log("UI2_ANSWER=" + answer().toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["nat-mul.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/nat-mul.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), [
    "UI2_DOUBLE=14",
    "UI2_PRODUCT=42",
    "UI2_MIXED=8",
    "UI2_CHOOSE_TRUE=15",
    "UI2_CHOOSE_FALSE=0",
    "UI2_ANSWER=42",
  ]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const oracleArtifact = stripStandardBootstrap(decoded) ?? decoded;
    const leanPath = path.join(outDir, "nat-mul.lean");
    const leanSource = `set_option linter.unusedVariables false\nset_option linter.unusedSimpArgs false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `theorem ui2_mul_eq_nat_mul (a b : Nat) : ProofScript.Internal.UI2.Nat.mul a b = Nat.mul a b := by\n` +
      `  induction b with\n` +
      `  | zero => rfl\n` +
      `  | succ b ih =>\n` +
      `    change ProofScript.Internal.UI2.Nat.mul a b + a = Nat.mul a b + a\n` +
      `    exact congrArg (fun x => x + a) ih\n` +
      `#reduce double 7\n#reduce product 6 7\n#reduce mixed 2 3\n#reduce chooseScaled true 5\n#reduce chooseScaled false 5\n#reduce answer\n`;
    fs.writeFileSync(leanPath, leanSource);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const observations = lean.stdout.split(/\r?\n/).map(x => x.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim()).filter(Boolean).slice(-6);
    assert.deepEqual(observations, ["14", "42", "8", "15", "Nat.zero", "42"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

const laterNamedIf = checkUnifiedSource("def ordinary: Nat := { if h: (1 = 1) { 2 } else { 3 } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted", "later cumulative integration must preserve UI2 while allowing named proposition-if");
assert.throws(
  () => checkUnifiedSource("def one: Nat := { 1 }\ntheorem bad: one * 2 = 3 := by { rfl }"),
  e => e instanceof Error && /standalone kernel rejected/.test(e.message),
);

console.log("✓ UI2 canonical Nat multiplication + UI1 control flow → Core v71 K3-TB → kernel/verifier → TS/Lean integration passed");
