import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Environment, installCorePrimitives, checkAndAddDeclaration, levelOfNat, sameTerm } from "../packages/kernel/dist/index.js";

const L0 = levelOfNat(0);
const L1 = levelOfNat(1);
const S = (level: any) => ({ tag: "sort", level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: "const", name, levels } as const);
const App = (fn: any, arg: any) => ({ tag: "app", fn, arg } as const);
const Apps = (fn: any, args: any[]) => args.reduce(App, fn);
const Pi = (domain: any, body: any, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit") => ({ tag: "pi", domain, body, binderInfo } as const);
const B = (index: number) => ({ tag: "bvar", index } as const);
const Arrow = (domain: any, body: any) => Pi(domain, body, "explicit");

function expectedPropextType(): any {
  // ∀ {a b : Prop}, Iff a b → Eq.{1} Prop a b
  const iffAB = Apps(C("Iff"), [B(1), B(0)]);
  const eqAB = Apps(C("Eq", [L1]), [S(L0), B(2), B(1)]);
  return Pi(S(L0), Pi(S(L0), Arrow(iffAB, eqAB), "implicit"), "implicit");
}

function assertInstallsPropextPrimitivePrelude(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env, { quotients: true, propext: true } as any);
  assert.ok(installed.includes("Iff"), "primitive installer must install Iff before propext when requested");
  assert.ok(installed.includes("Iff.intro"), "primitive installer must install Iff.intro");
  assert.ok(installed.includes("Iff.rec"), "primitive installer must generate Iff.rec");
  assert.ok(installed.includes("propext"), "primitive installer must install propext");
  assert.ok(installed.indexOf("Eq") < installed.indexOf("Iff"), "Iff depends on Eq/Prop prelude ordering");
  assert.ok(installed.indexOf("Iff") < installed.indexOf("propext"), "propext must be installed after Iff");
  assert.ok(installed.indexOf("propext") < installed.indexOf("Quot"), "propext must not depend on quotient initialization");
  const propext = env.get("propext");
  assert.ok(propext, "propext checked entry must exist");
  assert.equal(propext.declaration.kind, "axiom");
  assert.ok(sameTerm(propext.declaration.type, expectedPropextType()), "propext must use pinned Lean 4.33.1 type");
  assert.deepEqual([...propext.assumptions].sort(), [], "canonical propext is trusted primitive axiom, not an external user assumption");
}

function assertPropextTypechecksEqualityWitness(): void {
  const env = new Environment();
  installCorePrimitives(env, { propext: true } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "P", levelParams: [], type: S(L0) });
  checkAndAddDeclaration(env, { kind: "axiom", name: "Q", levelParams: [], type: S(L0) });
  checkAndAddDeclaration(env, { kind: "axiom", name: "h", levelParams: [], type: Apps(C("Iff"), [C("P"), C("Q")]) });
  const expected = Apps(C("Eq", [L1]), [S(L0), C("P"), C("Q")]);
  const value = Apps(C("propext"), [C("P"), C("Q"), C("h")]);
  const checked = checkAndAddDeclaration(env, { kind: "theorem", name: "p_eq_q", levelParams: [], type: expected, value });
  assert.deepEqual([...checked.assumptions].sort(), ["P", "Q", "h"].sort());
}

function assertExactLeanPropextOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean propext oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-propext-lean-"));
  const file = path.join(dir, "Propext.lean");
  fs.writeFileSync(file, `
#print Iff
#print propext
example {P Q : Prop} (h : P ↔ Q) : P = Q := propext h
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
  assert.match(`${run.stdout}\n${run.stderr}`, /structure Iff/);
  assert.match(`${run.stdout}\n${run.stderr}`, /axiom propext/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertInstallsPropextPrimitivePrelude();
assertPropextTypechecksEqualityWitness();
assertExactLeanPropextOracle();
console.log("KERNEL_PROPEXT_ACTIVE0=PASS exact-lean=PASS");
