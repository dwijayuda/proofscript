import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  checkAndAddDeclaration,
  installCorePrimitives,
  quotientSoundAxiom,
  levelOfNat,
  levelParam,
  sameTerm,
  defEq,
} from "../packages/kernel/dist/index.js";

const L0 = levelOfNat(0);
const L1 = levelOfNat(1);
const S = (level: any) => ({ tag: "sort", level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: "const", name, levels } as const);
const B = (index: number) => ({ tag: "bvar", index } as const);
const App = (fn: any, arg: any) => ({ tag: "app", fn, arg } as const);
const Apps = (fn: any, args: any[]) => args.reduce(App, fn);
const Pi = (domain: any, body: any, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit") => ({ tag: "pi", domain, body, binderInfo } as const);
const Lam = (domain: any, body: any, binderInfo: "explicit" | "implicit" | "strictImplicit" | "instImplicit" = "explicit") => ({ tag: "lam", domain, body, binderInfo } as const);
const Arrow = (domain: any, body: any) => Pi(domain, body, "explicit");

function assertInstallsCanonicalQuotSound(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env, { quotients: true });
  assert.ok(installed.includes("Quot"), "primitive installer must install Quot");
  assert.ok(installed.includes("Quot.mk"), "primitive installer must install Quot.mk");
  assert.ok(installed.includes("Quot.lift"), "primitive installer must install Quot.lift");
  assert.ok(installed.includes("Quot.ind"), "primitive installer must install Quot.ind");
  assert.ok(installed.includes("Quot.sound"), "primitive installer must install Quot.sound");

  const sound = env.get("Quot.sound");
  assert.ok(sound, "Quot.sound checked entry must exist after quotient primitive install");
  assert.equal(sound.declaration.kind, "axiom");
  assert.ok(sameTerm(sound.declaration.type, quotientSoundAxiom().type), "Quot.sound must use the pinned Lean 4.33.1 axiom type");
  assert.deepEqual([...sound.assumptions].sort(), [], "canonical Quot.sound is trusted as part of the quotient kernel primitive, not an external user assumption");
}

function assertQuotSoundCanTypecheckQuotMkEquality(): void {
  const env = new Environment();
  installCorePrimitives(env, { quotients: true });
  checkAndAddDeclaration(env, { kind: "axiom", name: "A", levelParams: [], type: S(L1) });
  checkAndAddDeclaration(env, { kind: "axiom", name: "a", levelParams: [], type: C("A") });
  checkAndAddDeclaration(env, { kind: "axiom", name: "b", levelParams: [], type: C("A") });
  checkAndAddDeclaration(env, { kind: "axiom", name: "Rab", levelParams: [], type: Apps(C("Eq", [L1]), [C("A"), C("a"), C("b")]) });

  const A = C("A");
  const eqA = Apps(C("Eq", [L1]), [A]);
  const lhs = Apps(C("Quot.mk", [L1]), [A, eqA, C("a")]);
  const rhs = Apps(C("Quot.mk", [L1]), [A, eqA, C("b")]);
  const expectedEquality = Apps(C("Eq", [L1]), [Apps(C("Quot", [L1]), [A, eqA]), lhs, rhs]);
  const soundApp = Apps(C("Quot.sound", [L1]), [A, eqA, C("a"), C("b"), C("Rab")]);
  assert.ok(defEq(env, [], expectedEquality, Apps(C("Eq", [L1]), [Apps(C("Quot", [L1]), [A, eqA]), lhs, rhs])));
  const checked = checkAndAddDeclaration(env, { kind: "theorem", name: "quotSoundWitness", levelParams: [], type: expectedEquality, value: soundApp });
  assert.deepEqual([...checked.assumptions].sort(), ["A", "Rab", "a", "b"].sort());
}

function assertQuotSoundDuplicateIsRejectedAtomically(): void {
  const env = new Environment();
  installCorePrimitives(env);
  checkAndAddDeclaration(env, { kind: "axiom", name: "Quot.sound", levelParams: [], type: S(L1) });
  assert.throws(
    () => checkAndAddDeclaration(env, { kind: "quot", name: "Quot", levelParams: [] }),
    /declaration name already exists: Quot\.sound|duplicate declaration: Quot\.sound/,
  );
  assert.equal(env.has("Quot"), false, "failed quotient initialization must be atomic and leave Quot absent");
}

function assertExactLeanQuotSoundOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) {
    console.log("○ exact Lean Quot.sound oracle unavailable");
    return;
  }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-quot-sound-lean-"));
  const file = path.join(dir, "QuotSound.lean");
  fs.writeFileSync(file, `
universe u

#check @Quot.sound
#print Quot.sound

example {α : Sort u} {r : α → α → Prop} {a b : α} (h : r a b) :
  Quot.mk r a = Quot.mk r b := Quot.sound h
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
  assert.match(`${run.stdout}\n${run.stderr}`, /axiom Quot\.sound/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertInstallsCanonicalQuotSound();
assertQuotSoundCanTypecheckQuotMkEquality();
assertQuotSoundDuplicateIsRejectedAtomically();
assertExactLeanQuotSoundOracle();
console.log("KERNEL_QUOT_SOUND_ACTIVE0=PASS exact-lean=PASS");
