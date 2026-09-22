import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkUnifiedSource, lowerProgramToCore, UNIFIED_INTEGRATION_PROFILE, UnifiedBridgeUnsupported } from "@proofscript/unified-bridge";
import { createUnifiedRegistry } from "@proofscript/unified-bridge";
import { checkSource } from "@proofscript/frontend-next";
import { decodeArtifact } from "@proofscript/kernel-codec";
import { verifyFile } from "@proofscript/verifier";
import { stripStandardBootstrap } from "@proofscript/environment";
import { emitLeanArtifact } from "@proofscript/lean-export";
import { assertCoreDeclarationsRejected, assertOnlyStandardBootstrapAssumptions, standardBootstrapAxiomSet } from "./bootstrap-assumptions.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "integration-fixtures/wave-d/generic-decidable.ps"), "utf8");
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.ok(["WAVED-decidable-transport", "WAVEE-decidable-synthesis", "WAVEF-hadd-dictionary", "WAVEG-add-dictionary", "WAVEH-user-add-instance", "PRODUCTION-P1-data-control", "PRODUCTION-P2-typeclasses", "PRODUCTION-P3-practical-profile", "PRODUCTION-P4-project-modules", "PRODUCTION-P5-module-namespaces", "PRODUCTION-P6-bounded-string"].includes(checked.integrationProfile));
assert.equal(checked.kernelSummary.status, "accepted");
assertOnlyStandardBootstrapAssumptions(checked.kernelSummary.assumptions, "checked kernel summary");

const chooseIr = checked.semanticIR.declarations.find(d => d.kind === "def" && d.name === "choose");
assert.ok(chooseIr && chooseIr.kind === "def");
assert.equal(chooseIr.params[0]?.name, "P");
assert.equal(chooseIr.params[0]?.type.sortAlias, "Prop");
assert.equal(chooseIr.params[1]?.name, "d");
assert.equal(chooseIr.params[1]?.type.family, "lean.decidable");
assert.equal(chooseIr.body.kind, "extension");
assert.equal(chooseIr.body.op, "lean.if");
assert.equal(chooseIr.body.payload?.decision, "instance");
assert.equal(chooseIr.body.args[3]?.kind, "var");
assert.equal(chooseIr.body.args[3]?.name, "d");

// Runtime representation: proposition parameter and branch proofs are erased; only the decision constructor tag remains.
assert.match(checked.typescript, /export type ProofScriptDecidable = Readonly<\{ readonly tag: "isTrue" \| "isFalse" \}>/);
assert.match(checked.typescript, /export function choose\(d: ProofScriptDecidable, x: bigint, y: bigint\): bigint/);
assert.match(checked.typescript, /d\.tag === "isTrue"/);
assert.doesNotMatch(checked.typescript, /function choose\(P/);
assert.doesNotMatch(checked.typescript, /proofCopy/);

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-wave-d-"));
try {
  const artifactPath = path.join(outDir, "wave-d.pscore.json");
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + "\n");
  const decoded = decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, "utf8")));
  const replay = verifyFile(artifactPath, standardBootstrapAxiomSet());
  assert.equal(replay.status, "accepted");
  assert.equal(replay.projectPluginsLoaded, false);

  const tsPath = path.join(outDir, "wave-d.ts");
  fs.writeFileSync(tsPath, checked.typescript + `
console.log("T=" + choose(__psDecidableIsTrue(), 11n, 22n).toString());
console.log("F=" + choose(__psDecidableIsFalse(), 11n, 22n).toString());
console.log("FT=" + forward(__psDecidableIsTrue(), 31n, 32n).toString());
console.log("FF=" + forward(__psDecidableIsFalse(), 31n, 32n).toString());
`);
  fs.writeFileSync(path.join(outDir, "package.json"), '{"type":"module"}\n');
  const tsc = spawnSync("tsc", ["wave-d.ts", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--outDir", "js"], { cwd: outDir, encoding: "utf8" });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(outDir, "js/wave-d.js")], { encoding: "utf8" });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), ["T=11", "F=22", "FT=31", "FF=32"]);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ["--version"], { encoding: "utf8" });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(decoded) ?? decoded;
    const builtinNames = new Set(["False", "True", "Not", "Decidable", "Nat.le", "Nat.lt"]);
    const oracleArtifact = { ...stripped, declarations: stripped.declarations.filter(d => !builtinNames.has(d.name)) };
    const leanPath = path.join(outDir, "wave-d.lean");
    fs.writeFileSync(leanPath, `set_option linter.unusedVariables false\n${emitLeanArtifact(oracleArtifact)}\n` +
      `#reduce @choose (2 = 2) (inferInstance : Decidable (2 = 2)) 11 22\n` +
      `#reduce @choose (2 = 3) (inferInstance : Decidable (2 = 3)) 11 22\n` +
      `#reduce @forward (2 = 2) (inferInstance : Decidable (2 = 2)) 31 32\n` +
      `#reduce @forward (2 = 3) (inferInstance : Decidable (2 = 3)) 31 32\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: "utf8", env: { ...process.env, TERM: "xterm" } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    const obs = clean.split(/\r?\n/).map(x => x.trim()).filter(x => /^[0-9]+$/.test(x));
    assert.deepEqual(obs.slice(-4), ["11", "22", "31", "32"]);
  }
} finally { fs.rmSync(outDir, { recursive: true, force: true }); }

// Bridge-level semantic-smuggling attack: mutate d : Decidable P into d : Decidable Q while the branch condition stays P.
const parsed = checkSource(source, createUnifiedRegistry()).program;
const attacked = structuredClone(parsed);
const d = attacked.declarations.find(x => x.kind === "def" && x.name === "choose");
assert.ok(d && d.kind === "def" && d.body.kind === "extension");
const evidence = d.body.args[3];
assert.ok(evidence && evidence.kind === "var" && evidence.type.args?.[0]?.kind === "term");
evidence.type = { ...evidence.type, args: [{ kind: "term", value: { kind: "op", op: "proof.eq", args: [
  { kind: "literal", op: "core.nat.literal", value: "2", type: { form: "nominal", id: "Nat", displayName: "Nat" } },
  { kind: "literal", op: "core.nat.literal", value: "3", type: { form: "nominal", id: "Nat", displayName: "Nat" } },
], type: { form: "sort", id: "lean.sort:Prop:0", displayName: "Prop", family: "lean.sort", universe: { kind: "zero" }, sortAlias: "Prop" } } }] };
assert.throws(() => lowerProgramToCore(attacked), e => e instanceof UnifiedBridgeUnsupported && /does not match/.test(e.message));

console.log("✓ Wave D generic Decidable(p) Core transport + proof-erased constructor-tag runtime ABI + replay + exact Lean + evidence mismatch rejection passed");
