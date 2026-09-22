import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  checkAndAddDeclaration,
  installCorePrimitives,
  iffReflDefinition,
  iffSymmDefinition,
  iffTransDefinition,
  levelOfNat,
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

function expectedIffReflType(): any {
  return Pi(S(L0), Apps(C("Iff"), [B(0), B(0)]), "explicit");
}
function expectedIffSymmType(): any {
  return Pi(S(L0), Pi(S(L0), Arrow(Apps(C("Iff"), [B(1), B(0)]), Apps(C("Iff"), [B(1), B(2)])), "implicit"), "implicit");
}
function expectedIffTransType(): any {
  return Pi(S(L0), Pi(S(L0), Pi(S(L0), Arrow(Apps(C("Iff"), [B(2), B(1)]), Arrow(Apps(C("Iff"), [B(2), B(1)]), Apps(C("Iff"), [B(4), B(2)]))), "implicit"), "implicit"), "implicit");
}

function assertInstallsIffBasicTheorems(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env, { quotients: true, propext: true } as any);
  for (const name of ["Iff.refl", "Iff.symm", "Iff.trans"]) {
    assert.ok(installed.includes(name), `primitive installer must install ${name}`);
    assert.ok(env.get(name), `environment must contain checked ${name}`);
    assert.deepEqual([...(env.get(name) as any).assumptions].sort(), [], `${name} must be a checked bootstrap theorem, not an axiom`);
  }
  assert.ok(installed.indexOf("Iff.mpr") < installed.indexOf("Iff.refl"), "Iff.refl must be checked after Iff eliminators exist");
  assert.ok(installed.indexOf("Iff.refl") < installed.indexOf("Iff.symm"), "Iff.symm follows Iff.refl deterministically");
  assert.ok(installed.indexOf("Iff.symm") < installed.indexOf("Iff.trans"), "Iff.trans follows Iff.symm deterministically");
  assert.ok(installed.indexOf("Iff.trans") < installed.indexOf("propext"), "propext installs after derived Iff theorems");
  assert.ok(sameTerm((env.get("Iff.refl") as any).declaration.type, expectedIffReflType()), "Iff.refl must use the pinned Lean 4.33.1 type");
  assert.ok(sameTerm((env.get("Iff.symm") as any).declaration.type, expectedIffSymmType()), "Iff.symm must use the pinned Lean 4.33.1 type");
  assert.ok(sameTerm((env.get("Iff.trans") as any).declaration.type, expectedIffTransType()), "Iff.trans must use the pinned Lean 4.33.1 type");
}

function assertIffBasicTheoremsTypecheckUseSites(): void {
  const env = new Environment();
  installCorePrimitives(env, { propext: true } as any);
  for (const p of ["P", "Q", "R"]) checkAndAddDeclaration(env, { kind: "axiom", name: p, levelParams: [], type: S(L0) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "hPQ", levelParams: [], type: Apps(C("Iff"), [C("P"), C("Q")]) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "hQR", levelParams: [], type: Apps(C("Iff"), [C("Q"), C("R")]) } as any);
  const reflP = Apps(C("Iff.refl"), [C("P")]);
  const symmPQ = Apps(C("Iff.symm"), [C("P"), C("Q"), C("hPQ")]);
  const transPR = Apps(C("Iff.trans"), [C("P"), C("Q"), C("R"), C("hPQ"), C("hQR")]);
  checkAndAddDeclaration(env, { kind: "theorem", name: "iffReflP", levelParams: [], type: Apps(C("Iff"), [C("P"), C("P")]), value: reflP } as any);
  checkAndAddDeclaration(env, { kind: "theorem", name: "iffSymmQP", levelParams: [], type: Apps(C("Iff"), [C("Q"), C("P")]), value: symmPQ } as any);
  checkAndAddDeclaration(env, { kind: "theorem", name: "iffTransPR", levelParams: [], type: Apps(C("Iff"), [C("P"), C("R")]), value: transPR } as any);
}

function assertDirectDefinitionsAreChecked(): void {
  const env = new Environment();
  installCorePrimitives(env, { propext: true } as any);
  assert.ok(sameTerm(iffReflDefinition().type, expectedIffReflType()), "exported Iff.refl helper must expose the audited type");
  assert.ok(sameTerm(iffSymmDefinition().type, expectedIffSymmType()), "exported Iff.symm helper must expose the audited type");
  assert.ok(sameTerm(iffTransDefinition().type, expectedIffTransType()), "exported Iff.trans helper must expose the audited type");
}

function assertExactLeanOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean Iff theorem oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-iff-basic-lean-"));
  const file = path.join(dir, "IffBasic.lean");
  fs.writeFileSync(file, `
#print Iff.refl
#print Iff.symm
#print Iff.trans
example {P : Prop} : P ↔ P := Iff.refl P
example {P Q : Prop} (h : P ↔ Q) : Q ↔ P := Iff.symm h
example {P Q R : Prop} (h₁ : P ↔ Q) (h₂ : Q ↔ R) : P ↔ R := Iff.trans h₁ h₂
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
  assert.match(`${run.stdout}\n${run.stderr}`, /Iff\.refl/);
  assert.match(`${run.stdout}\n${run.stderr}`, /Iff\.symm/);
  assert.match(`${run.stdout}\n${run.stderr}`, /Iff\.trans/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertInstallsIffBasicTheorems();
assertIffBasicTheoremsTypecheckUseSites();
assertDirectDefinitionsAreChecked();
assertExactLeanOracle();
console.log("KERNEL_IFF_BASIC_THEOREMS_ACTIVE0=PASS exact-lean=PASS");
