import assert from "node:assert/strict";
import { checkSource } from "../packages/frontend/dist/index.js";
import { loadStandardBootstrap } from "../packages/environment/dist/index.js";
import { decodeArtifact } from "../packages/kernel-codec/dist/index.js";
import { Environment, checkAndAddDeclaration, infer, kernelWhnf, pretty } from "../packages/kernel/dist/index.js";

const source = `
def keep(P: Prop, h: P): P := {
  let x := h;
  x
}

def keepTyped(P: Prop, h: P): P := {
  let x: P := h;
  let y := x;
  y
}

theorem keepWorks(P: Prop, h: P): P := keepTyped(P, h);
`;

const checked = checkSource(source);
assert.equal(checked.summary.status, "accepted");
assert.equal(checked.artifact.formatVersion, 12);
assert.equal(checked.artifact.implementationProfile, "K3c-section-vars0");
assert.deepEqual(checked.summary.declarations.map(d => d.name), ["keep", "keepTyped", "keepWorks"]);
assert.equal(checked.summary.assumptions.length, 0);
assert.ok(JSON.stringify(checked.artifact).includes('"tag":"let"') || JSON.stringify(checked.artifact).includes('"tag": "let"'));

// Core zeta reduction is a kernel operation, independent of source elaboration.
const Type = { tag: "sort", level: { tag: "succ", of: { tag: "zero" } } };
const Prop = { tag: "sort", level: { tag: "zero" } };
const directLet = { tag: "let", type: Type, value: Prop, body: { tag: "bvar", index: 0 }, nondep: false };
const empty = new Environment();
assert.equal(pretty(infer(empty, [], directLet)), "Type");
assert.equal(pretty(kernelWhnf(empty, directLet)), "Prop");

// Untyped let inference can use the checked standard environment, not TS rules.
const std = loadStandardBootstrap().artifact;
const arithmetic = checkSource(`
def addZeroLocal(n: Nat): Nat := {
  let x := Nat.add(n, Nat.zero);
  x
}
theorem addZeroLocalCorrect(n: Nat): Eq.{1}(Nat, addZeroLocal(n), n) := Eq.refl.{1}(Nat, n);
`, { prelude: std });
assert.equal(arithmetic.summary.status, "accepted");
assert.ok(arithmetic.summary.declarations.some(d => d.name === "addZeroLocalCorrect"));

// Round-trip through the inert v5 codec and fresh kernel environment.
const round = decodeArtifact(JSON.parse(JSON.stringify(checked.artifact)));
const replayEnv = new Environment();
for (const d of round.declarations) checkAndAddDeclaration(replayEnv, d);
assert.ok(replayEnv.has("keepTyped"));

// Ordered defBody dispatch: once a local let prefix is recognized, ';' is mandatory.
let missingSemi = false;
try {
  checkSource(`def bad(P: Prop, h: P): P := { let x := h x }`);
} catch (e) {
  missingSemi = /expected ';'/i.test(String(e));
}
assert.equal(missingSemi, true, "missing def-body let separator must be a parse error");

// `have` preserves Lean's nondependent-local-binding bit instead of being rewritten to ordinary let.
const haveChecked = checkSource(`
def useHave(P: Prop, h: P): P := {
  have hp: P := h;
  hp
}

def useHaveInfer(P: Prop, h: P): P := {
  have hp := h;
  hp
}
`);
assert.equal(haveChecked.summary.status, "accepted");
const haveDefs = haveChecked.artifact.declarations.filter(d => d.kind === "definition");
assert.equal(haveDefs.length, 2);
for (const d of haveDefs) {
  let t = d.value;
  while (t.tag === "lam") t = t.body;
  assert.equal(t.tag, "let");
  assert.equal(t.nondep, true, "have must preserve nondep=true in the core artifact");
}

// A v4/K1d artifact is not allowed to smuggle the new v5 let constructor.
let legacyLetRejected = false;
try {
  decodeArtifact({
    format: "proofscript-core",
    formatVersion: 4,
    proofscriptReference: "v0.1",
    leanSemanticBaseline: "4.33.1",
    implementationProfile: "K1d-foundation0",
    declarations: [{
      kind: "definition",
      name: "badLegacyLet",
      levelParams: [],
      reducibility: "regular",
      type: Type,
      value: directLet,
    }],
  });
} catch (e) {
  legacyLetRejected = /unavailable in this artifact profile/i.test(String(e));
}
assert.equal(legacyLetRejected, true, "old artifact profiles must not gain new term constructors retroactively");

console.log("✓ K2a let/have core bindings, zeta reduction, def-body sequencing, inference, and artifact gating passed");
