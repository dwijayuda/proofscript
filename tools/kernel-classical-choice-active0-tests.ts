import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  installCorePrimitives,
  checkAndAddDeclaration,
  nonemptyDeclaration,
  classicalChoiceAxiom,
  levelOfNat,
  levelParam,
  sameTerm,
} from "../packages/kernel/dist/index.js";

const L0 = levelOfNat(0);
const S = (level: any) => ({ tag: "sort", level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: "const", name, levels } as const);
const B = (index: number) => ({ tag: "bvar", index } as const);
const App = (fn: any, arg: any) => ({ tag: "app", fn, arg } as const);
const Apps = (fn: any, args: any[]) => args.reduce(App, fn);
const Pi = (domain: any, body: any, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit") => ({ tag: "pi", domain, body, binderInfo } as const);
const Arrow = (domain: any, body: any) => Pi(domain, body, "explicit");

function expectedNonemptyType(): any {
  const u = levelParam("u");
  return Pi(S(u), S(L0), "explicit");
}

function expectedChoiceType(): any {
  const u = levelParam("u");
  // ∀ {α : Sort u}, Nonempty α → α. After the h : Nonempty α binder,
  // α is one de Bruijn level farther out.
  return Pi(S(u), Pi(Apps(C("Nonempty", [u]), [B(0)]), B(1), "explicit"), "implicit");
}

function assertInstallsClassicalChoicePrelude(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env, { classical: true } as any);
  assert.ok(installed.includes("Nonempty"), "primitive installer must install Nonempty when classical choice is requested");
  assert.ok(installed.includes("Nonempty.intro"), "primitive installer must install Nonempty.intro");
  assert.ok(installed.includes("Nonempty.rec"), "primitive installer must generate Nonempty.rec");
  assert.ok(installed.includes("Classical.choice"), "primitive installer must install Classical.choice");
  assert.ok(installed.indexOf("Nonempty") < installed.indexOf("Classical.choice"), "Classical.choice depends on Nonempty");

  const nonempty = env.get("Nonempty");
  assert.ok(nonempty, "Nonempty checked entry must exist");
  assert.equal(nonempty.declaration.kind, "inductive");
  assert.ok(sameTerm(nonempty.declaration.type, expectedNonemptyType()), "Nonempty must use Lean 4.33.1 type Sort u → Prop");

  const choice = env.get("Classical.choice");
  assert.ok(choice, "Classical.choice checked entry must exist");
  assert.equal(choice.declaration.kind, "axiom");
  assert.ok(sameTerm(choice.declaration.type, expectedChoiceType()), "Classical.choice must use pinned Lean 4.33.1 type");
  assert.deepEqual([...choice.assumptions].sort(), [], "canonical Classical.choice is trusted primitive axiom, not an external user assumption");
}

function assertClassicalChoiceCanTypecheckDataFromNonempty(): void {
  const env = new Environment();
  installCorePrimitives(env, { classical: true } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "A", levelParams: [], type: S(levelOfNat(1)) });
  checkAndAddDeclaration(env, { kind: "axiom", name: "hA", levelParams: [], type: Apps(C("Nonempty", [levelOfNat(1)]), [C("A")]) });
  const checked = checkAndAddDeclaration(env, {
    kind: "definition",
    name: "pickedA",
    levelParams: [],
    type: C("A"),
    value: Apps(C("Classical.choice", [levelOfNat(1)]), [C("A"), C("hA")]),
    reducibility: "regular",
  } as any);
  assert.deepEqual([...checked.assumptions].sort(), ["A", "hA"].sort());
}

function assertClassicalChoiceDoesNotInstallByDefault(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env);
  assert.equal(installed.includes("Classical.choice"), false, "Classical.choice must be opt-in trusted axiom slice");
  assert.equal(env.has("Classical.choice"), false);
}

function assertDeclaredShapesMatchGenerators(): void {
  assert.ok(sameTerm(nonemptyDeclaration().type, expectedNonemptyType()));
  assert.ok(sameTerm(classicalChoiceAxiom().type, expectedChoiceType()));
}

function assertExactLeanClassicalChoiceOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean Classical.choice oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-classical-choice-lean-"));
  const file = path.join(dir, "ClassicalChoice.lean");
  fs.writeFileSync(file, `
set_option pp.universes true
set_option pp.explicit true
#print Nonempty
#print Classical.choice
#check @Nonempty
#check @Nonempty.intro
#check @Nonempty.rec
#check @Classical.choice
noncomputable def picked {α : Sort u} (h : Nonempty α) : α := Classical.choice h
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
  const out = `${run.stdout}\n${run.stderr}`;
  assert.match(out, /inductive Nonempty\.\{u\} : Sort u → Prop/);
  assert.match(out, /axiom Classical\.choice\.\{u\} : \{α : Sort u\} → Nonempty\.\{u\} α → α/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertDeclaredShapesMatchGenerators();
assertClassicalChoiceDoesNotInstallByDefault();
assertInstallsClassicalChoicePrelude();
assertClassicalChoiceCanTypecheckDataFromNonempty();
assertExactLeanClassicalChoiceOracle();
console.log("KERNEL_CLASSICAL_CHOICE_ACTIVE0=PASS exact-lean=PASS");
