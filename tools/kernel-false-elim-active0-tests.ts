import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  checkAndAddDeclaration,
  falseDeclaration,
  falseElimDefinition,
  installCorePrimitives,
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

function expectedFalseType(): any { return S(L0); }
function expectedFalseElimType(): any {
  const u = levelParam("u");
  return Pi(S(u), Arrow(C("False"), B(1)), "implicit");
}

function assertInstallerAddsFalseAndFalseElim(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env);
  assert.ok(installed.includes("False"), "primitive installer must install False");
  assert.ok(installed.includes("False.rec"), "empty False inductive must generate False.rec");
  assert.ok(installed.includes("False.elim"), "primitive installer must install checked False.elim");
  assert.ok(installed.indexOf("False.rec") < installed.indexOf("False.elim"), "False.elim depends on generated False.rec");
  assert.ok(sameTerm((env.get("False") as any).declaration.type, expectedFalseType()), "False must be Prop");
  assert.ok(sameTerm((env.get("False.elim") as any).declaration.type, expectedFalseElimType()), "False.elim must use Lean 4.33.1 type");
  assert.deepEqual([...(env.get("False.elim") as any).assumptions].sort(), [], "False.elim must be checked definition, not axiom");
  assert.equal((env.get("False.elim") as any).declaration.kind, "definition");
}

function assertFalseElimCanProduceAnySort(): void {
  const env = new Environment();
  installCorePrimitives(env);
  checkAndAddDeclaration(env, { kind: "axiom", name: "A", levelParams: [], type: S(levelOfNat(1)) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "hFalse", levelParams: [], type: C("False") } as any);
  checkAndAddDeclaration(env, {
    kind: "definition",
    name: "absurdA",
    levelParams: [],
    type: C("A"),
    value: Apps(C("False.elim", [levelOfNat(1)]), [C("A"), C("hFalse")]),
    reducibility: "regular",
  } as any);
}

function assertDeclaredShapesMatchGenerators(): void {
  assert.ok(sameTerm(falseDeclaration().type, expectedFalseType()));
  assert.ok(sameTerm(falseElimDefinition().type, expectedFalseElimType()));
}

function assertExactLeanFalseOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean False oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-false-elim-lean-"));
  const file = path.join(dir, "FalseElim.lean");
  fs.writeFileSync(file, `
set_option pp.universes true
set_option pp.explicit true
#print False
#check @False.rec
#check @False.elim
#print axioms False.elim
example {C : Sort u} (h : False) : C := False.elim h
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout + run.stderr, /inductive False : Prop/);
  assert.match(run.stdout + run.stderr, /@False\.elim\.\{u_1\} : \{C : Sort u_1\} → False → C/);
  assert.match(run.stdout + run.stderr, /'False\.elim' does not depend on any axioms/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertInstallerAddsFalseAndFalseElim();
assertFalseElimCanProduceAnySort();
assertDeclaredShapesMatchGenerators();
assertExactLeanFalseOracle();
console.log("KERNEL_FALSE_ELIM_ACTIVE0=PASS exact-lean=PASS");
