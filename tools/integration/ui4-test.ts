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
  UI4_NAT_LE,
  UI4_NAT_LT,
} from "@proofscript/unified-bridge";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/ui4/nat-order.ps"), "utf8");
const checked = checkUnifiedSource(source);

assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");
assert.equal(checked.coreArtifact.formatVersion, 71);
assert.equal(checked.coreArtifact.implementationProfile, "KERNEL-level-instantiation-conformance1");

const le = checked.coreArtifact.declarations.find(d => d.name === UI4_NAT_LE);
const lt = checked.coreArtifact.declarations.find(d => d.name === UI4_NAT_LT);
assert.equal(le?.kind, "inductive");
assert.equal(le.numParams, 1);
assert.equal(le.numIndices, 1);
assert.deepEqual(le.constructors.map(c => c.name), ["Nat.le.refl", "Nat.le.step"]);
assert.equal(lt?.kind, "definition");

function visitTerm(term, f) {
  f(term);
  if (term.tag === "app") { visitTerm(term.fn, f); visitTerm(term.arg, f); }
  else if (term.tag === "lam" || term.tag === "pi") { visitTerm(term.domain, f); visitTerm(term.body, f); }
  else if (term.tag === "let") { visitTerm(term.type, f); visitTerm(term.value, f); visitTerm(term.body, f); }
  else if (term.tag === "proj") visitTerm(term.expr, f);
}
let sawLe = false, sawLt = false;
for (const d of checked.coreArtifact.declarations) {
  for (const key of ["type", "value"]) {
    if (!d[key]) continue;
    visitTerm(d[key], t => {
      if (t.tag === "const" && t.name === UI4_NAT_LE) sawLe = true;
      if (t.tag === "const" && t.name === UI4_NAT_LT) sawLt = true;
    });
  }
}
assert.equal(sawLe, true);
assert.equal(sawLt, true);

const noOrder = checkUnifiedSource("def one: Nat := { 1 }");
assert.equal(noOrder.coreArtifact.declarations.some(d => d.name === UI4_NAT_LE || d.name === UI4_NAT_LT), false,
  "UI4 ordering library must be inserted only when canonical Nat ordering is used");

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-ui4-"));
try {
  const artifactPath = path.join(outDir, "nat-order.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  assert.equal(verifyFile(artifactPath, standardBootstrapAxiomSet()).status, "accepted");

  const tsPath = path.join(outDir, "nat-order.ts");
  fs.writeFileSync(tsPath, checked.typescript + `\nconsole.log("UI4_ANSWER=" + answer().toString());\n`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["nat-order.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/nat-order.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.equal(runtime.stdout.trim(), "UI4_ANSWER=42");

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    // Nat.le/Nat.lt in Core are exact copies/models of Lean builtins. Omit their
    // declarations for the oracle source and let references resolve to Lean 4.33.1.
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => d.name !== UI4_NAT_LE && d.name !== UI4_NAT_LT) };
    const leanPath = path.join(outDir, "nat-order.lean");
    const leanSource = `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n#reduce answer\n#check leRefl\n#check ltSucc\n#check twoLtThree\n`;
    fs.writeFileSync(leanPath, leanSource);
    const leanRun = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(leanRun.status, 0, leanRun.stderr || leanRun.stdout);
    assert.match(leanRun.stdout, /42/);
    assert.match(leanRun.stdout, /leRefl/);
    assert.match(leanRun.stdout, /ltSucc/);
    assert.match(leanRun.stdout, /twoLtThree/);
  }
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Later cumulative profiles add proof-carrying Decidable and named proposition-if while preserving UI4 ordering.
const laterNamedIf = checkUnifiedSource("def choose(a: Nat, b: Nat): Nat := { if h: (a <= b) { a } else { b } }");
assert.equal(laterNamedIf.kernelSummary.status, "accepted");

// A noncanonical/custom dictionary must never be silently collapsed to Nat.le.
const custom = structuredClone(checked.semanticIR);
let changed = false;
for (const d of custom.declarations) {
  if (d.kind !== "extension" || d.op !== "lean.theorem" || !d.args?.[0]) continue;
  const p = d.args[0];
  if (p.kind === "op" && p.op === "lean.le" && p.args[0]?.kind === "var") {
    p.args[0] = { ...p.args[0], name: "customLENat" };
    changed = true;
    break;
  }
}
assert.equal(changed, true);
assert.throws(
  () => lowerProgramToCore(custom),
  e => e instanceof UnifiedBridgeUnsupported && /canonical LE Nat dictionary path/.test(e.message),
);

assert.throws(
  () => checkUnifiedSource("theorem bad: 2 < 4 := by { rfl }"),
  e => e instanceof Error && /standalone kernel rejected/.test(e.message),
);

console.log("✓ UI4 canonical Nat ≤/< → exact checked Core propositions → kernel/verifier → TS/Lean integration passed");
