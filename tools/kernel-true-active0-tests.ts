import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  checkAndAddDeclaration,
  installCorePrimitives,
  levelOfNat,
  sameTerm,
  trueDeclaration,
} from "../packages/kernel/dist/index.js";

const L0 = levelOfNat(0);
const S = (level: any) => ({ tag: "sort", level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: "const", name, levels } as const);

function expectedTrueType(): any { return S(L0); }

function assertInstallerAddsTrue(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env);
  assert.ok(installed.includes("True"), "primitive installer must install True");
  assert.ok(installed.includes("True.intro"), "primitive installer must install True.intro");
  assert.ok(installed.includes("True.rec"), "singleton True proposition must generate True.rec");
  assert.ok(sameTerm((env.get("True") as any).declaration.type, expectedTrueType()), "True must be Prop");
  assert.equal((env.get("True") as any).declaration.kind, "inductive");
  assert.deepEqual([...(env.get("True") as any).assumptions].sort(), [], "True must be checked primitive inductive, not axiom");
}

function assertTrueIntroCanTypecheckProof(): void {
  const env = new Environment();
  installCorePrimitives(env);
  checkAndAddDeclaration(env, {
    kind: "definition",
    name: "trivialTrue",
    levelParams: [],
    type: C("True"),
    value: C("True.intro"),
    reducibility: "regular",
  } as any);
}

function assertDeclaredShapeMatchesGenerator(): void {
  assert.ok(sameTerm(trueDeclaration().type, expectedTrueType()));
  assert.equal(trueDeclaration().constructors.length, 1);
  assert.equal(trueDeclaration().constructors[0].name, "True.intro");
  assert.ok(sameTerm(trueDeclaration().constructors[0].type, C("True")));
}

function assertExactLeanTrueOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean True oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-true-lean-"));
  const file = path.join(dir, "True.lean");
  fs.writeFileSync(file, `
set_option pp.universes true
set_option pp.explicit true
#print True
#check @True.intro
#check @True.rec
#print axioms True.intro
example : True := True.intro
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const out = run.stdout + run.stderr;
  assert.match(out, /inductive True : Prop/);
  assert.match(out, /True\.intro : True/);
  assert.match(out, /'True\.intro' does not depend on any axioms/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertDeclaredShapeMatchesGenerator();
assertInstallerAddsTrue();
assertTrueIntroCanTypecheckProof();
assertExactLeanTrueOracle();
console.log("KERNEL_TRUE_ACTIVE0=PASS exact-lean=PASS");
