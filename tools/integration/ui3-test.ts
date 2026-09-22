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
  UI3_INTERNAL_NAT_PRED,
  UI3_INTERNAL_NAT_SUB,
  lowerProgramToCore,
} from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/ui3/nat-sub.ps"), "utf8");
const checked = checkUnifiedSource(source);

assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assert.equal(checked.coreArtifact.formatVersion, 71);
assert.equal(checked.coreArtifact.implementationProfile, "KERNEL-level-instantiation-conformance1");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.match(checked.sourceSha256, /^[0-9a-f]{64}$/);
assert.match(checked.semanticIrSha256, /^[0-9a-f]{64}$/);
assert.match(checked.coreSha256, /^[0-9a-f]{64}$/);

const pred = checked.coreArtifact.declarations.find(d => d.name === UI3_INTERNAL_NAT_PRED);
const sub = checked.coreArtifact.declarations.find(d => d.name === UI3_INTERNAL_NAT_SUB);
const mul = checked.coreArtifact.declarations.find(d => d.name === UI2_INTERNAL_NAT_MUL);
assert.equal(pred?.kind, "definition");
assert.equal(sub?.kind, "definition");
assert.equal(mul?.kind, "definition", "UI3 fixture intentionally composes subtraction with frozen UI2 multiplication");

function visitTerm(term, f) {
  f(term);
  if (term.tag === "app") { visitTerm(term.fn, f); visitTerm(term.arg, f); }
  else if (term.tag === "lam" || term.tag === "pi") { visitTerm(term.domain, f); visitTerm(term.body, f); }
  else if (term.tag === "let") { visitTerm(term.type, f); visitTerm(term.value, f); visitTerm(term.body, f); }
  else if (term.tag === "proj") visitTerm(term.expr, f);
}
let predSawRec = false;
visitTerm(pred.value, t => { if (t.tag === "const" && t.name === "Nat.rec") predSawRec = true; });
assert.equal(predSawRec, true, "UI3 Nat.pred helper must be expressed through trusted Nat.rec");
let subSawRec = false, subSawPred = false;
visitTerm(sub.value, t => {
  if (t.tag === "const" && t.name === "Nat.rec") subSawRec = true;
  if (t.tag === "const" && t.name === UI3_INTERNAL_NAT_PRED) subSawPred = true;
});
assert.equal(subSawRec, true, "UI3 Nat.sub helper must recurse through trusted Nat.rec");
assert.equal(subSawPred, true, "UI3 Nat.sub successor case must use the checked predecessor helper");

let sawSubReference = false;
for (const declaration of checked.coreArtifact.declarations.filter(d => !d.name.startsWith("ProofScript.Internal.UI3."))) {
  for (const key of ["type", "value"]) {
    const term = declaration[key];
    if (!term) continue;
    visitTerm(term, node => { if (node.tag === "const" && node.name === UI3_INTERNAL_NAT_SUB) sawSubReference = true; });
  }
}
assert.equal(sawSubReference, true, "canonical HSub Nat Nat Nat must lower to checked UI3 Core Nat.sub");

const noSub = checkUnifiedSource("def one: Nat := { 1 }");
assert.equal(noSub.coreArtifact.declarations.some(d => d.name === UI3_INTERNAL_NAT_PRED || d.name === UI3_INTERNAL_NAT_SUB), false,
  "UI3 subtraction helpers must be inserted only when required");

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ui3-"));
try {
  const artifactPath = path.join(outDir, "nat-sub.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  assert.equal(decoded.formatVersion, 71);
  assert.equal(verifyFile(artifactPath, standardBootstrapAxiomSet()).status, "accepted");

  const tsPath = path.join(outDir, "nat-sub.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("UI3_SUB=" + subtract(12n, 5n).toString());
console.log("UI3_UNDERFLOW=" + subtract(5n, 8n).toString());
console.log("UI3_MIXED=" + mixedSub(5n, 4n).toString());
console.log("UI3_CHOOSE_TRUE=" + chooseDifference(true, 9n, 4n).toString());
console.log("UI3_CHOOSE_FALSE=" + chooseDifference(false, 9n, 4n).toString());
console.log("UI3_ANSWER=" + answer().toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["nat-sub.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/nat-sub.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), [
    "UI3_SUB=7", "UI3_UNDERFLOW=0", "UI3_MIXED=11", "UI3_CHOOSE_TRUE=5", "UI3_CHOOSE_FALSE=0", "UI3_ANSWER=42",
  ]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const oracleArtifact = stripStandardBootstrap(decoded) ?? decoded;
    const leanPath = path.join(outDir, "nat-sub.lean");
    const leanSource = `set_option linter.unusedVariables false\nset_option linter.unusedSimpArgs false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `theorem ui3_pred_eq_nat_pred (n : Nat) : ProofScript.Internal.UI3.Nat.pred n = n.pred := by\n` +
      `  cases n <;> rfl\n\n` +
      `theorem ui3_sub_eq_nat_sub (a b : Nat) : ProofScript.Internal.UI3.Nat.sub a b = a - b := by\n` +
      `  induction b with\n` +
      `  | zero => rfl\n` +
      `  | succ b ih =>\n` +
      `    rw [Nat.sub_succ]\n` +
      `    change ProofScript.Internal.UI3.Nat.pred (ProofScript.Internal.UI3.Nat.sub a b) = (a - b).pred\n` +
      `    rw [ih, ui3_pred_eq_nat_pred]\n\n` +
      `#reduce subtract 12 5\n#reduce subtract 5 8\n#reduce mixedSub 5 4\n#reduce chooseDifference true 9 4\n#reduce chooseDifference false 9 4\n#reduce answer\n`;
    fs.writeFileSync(leanPath, leanSource);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const observations = lean.stdout.split(/\r?\n/).map(x => x.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim()).filter(Boolean).slice(-6);
    assert.deepEqual(observations, ["7", "Nat.zero", "11", "5", "Nat.zero", "42"]);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

const laterNamedIf = checkUnifiedSource("def ordinary: Nat := { if h: (1 = 1) { 2 } else { 3 } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted", "later cumulative integration must preserve UI3 while allowing named proposition-if");
assert.throws(
  () => checkUnifiedSource("def one: Nat := { 1 }\ntheorem bad: 5 - 2 = 4 := by { rfl }"),
  e => e instanceof Error && /standalone kernel rejected/.test(e.message),
);
const reservedIr = {
  ...noSub.semanticIR,
  declarations: noSub.semanticIR.declarations.map(d => d.kind === "def" ? { ...d, semanticName: UI3_INTERNAL_NAT_SUB } : d),
};
assert.throws(
  () => lowerProgramToCore(reservedIr),
  e => e instanceof UnifiedBridgeUnsupported && /reserved integration name/.test(e.message),
);

console.log("✓ UI3 canonical Nat subtraction → checked Core library → kernel/verifier → TS/Lean integration passed");
