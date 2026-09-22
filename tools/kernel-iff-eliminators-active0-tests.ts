import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  Environment,
  checkAndAddDeclaration,
  installCorePrimitives,
  iffMpDefinition,
  iffMprDefinition,
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

function expectedIffMpType(): any {
  return Pi(S(L0), Pi(S(L0), Arrow(Apps(C("Iff"), [B(1), B(0)]), Arrow(B(2), B(2))), "implicit"), "implicit");
}

function expectedIffMprType(): any {
  return Pi(S(L0), Pi(S(L0), Arrow(Apps(C("Iff"), [B(1), B(0)]), Arrow(B(1), B(3))), "implicit"), "implicit");
}

function assertInstallsIffEliminators(): void {
  const env = new Environment();
  const installed = installCorePrimitives(env, { quotients: true, propext: true } as any);
  for (const name of ["Iff", "Iff.intro", "Iff.rec", "Iff.mp", "Iff.mpr", "propext"]) {
    assert.ok(installed.includes(name), `primitive installer must install ${name}`);
    assert.ok(env.get(name), `environment must contain checked ${name}`);
  }
  assert.ok(installed.indexOf("Iff.rec") < installed.indexOf("Iff.mp"), "Iff.mp must be checked after Iff.rec exists");
  assert.ok(installed.indexOf("Iff.mp") < installed.indexOf("Iff.mpr"), "Iff.mpr follows Iff.mp deterministically");
  assert.ok(installed.indexOf("Iff.mpr") < installed.indexOf("propext"), "propext installs after Iff eliminators");

  assert.ok(sameTerm((env.get("Iff.mp") as any).declaration.type, expectedIffMpType()), "Iff.mp must use the pinned Lean 4.33.1 type");
  assert.ok(sameTerm((env.get("Iff.mpr") as any).declaration.type, expectedIffMprType()), "Iff.mpr must use the pinned Lean 4.33.1 type");
  assert.deepEqual([...(env.get("Iff.mp") as any).assumptions].sort(), [], "Iff.mp is a checked bootstrap definition, not an external axiom");
  assert.deepEqual([...(env.get("Iff.mpr") as any).assumptions].sort(), [], "Iff.mpr is a checked bootstrap definition, not an external axiom");
}

function assertIffEliminatorsTypecheckUseSites(): void {
  const env = new Environment();
  installCorePrimitives(env, { propext: true } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "P", levelParams: [], type: S(L0) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "Q", levelParams: [], type: S(L0) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "h", levelParams: [], type: Apps(C("Iff"), [C("P"), C("Q")]) } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "hp", levelParams: [], type: C("P") } as any);
  checkAndAddDeclaration(env, { kind: "axiom", name: "hq", levelParams: [], type: C("Q") } as any);

  const qFromP = Apps(C("Iff.mp"), [C("P"), C("Q"), C("h"), C("hp")]);
  const pFromQ = Apps(C("Iff.mpr"), [C("P"), C("Q"), C("h"), C("hq")]);
  const qChecked = checkAndAddDeclaration(env, { kind: "theorem", name: "qFromP", levelParams: [], type: C("Q"), value: qFromP } as any);
  const pChecked = checkAndAddDeclaration(env, { kind: "theorem", name: "pFromQ", levelParams: [], type: C("P"), value: pFromQ } as any);
  assert.deepEqual([...qChecked.assumptions].sort(), ["P", "Q", "h", "hp"].sort());
  assert.deepEqual([...pChecked.assumptions].sort(), ["P", "Q", "h", "hq"].sort());
}

function assertDirectDefinitionsAreChecked(): void {
  const env = new Environment();
  installCorePrimitives(env, { propext: true } as any);
  assert.ok(sameTerm(iffMpDefinition().type, expectedIffMpType()), "exported Iff.mp definition helper must expose the audited type");
  assert.ok(sameTerm(iffMprDefinition().type, expectedIffMprType()), "exported Iff.mpr definition helper must expose the audited type");
}

function assertExactLeanIffEliminatorOracle(): void {
  const lean = process.env.PROOFSCRIPT_LEAN_BIN ?? "lean";
  const version = spawnSync(lean, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) { console.log("○ exact Lean Iff eliminator oracle unavailable"); return; }
  assert.match(version.stdout, /version 4\.33\.1,/);
  assert.match(version.stdout, /commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-iff-elim-lean-"));
  const file = path.join(dir, "IffEliminators.lean");
  fs.writeFileSync(file, `
#print Iff.mp
#print Iff.mpr
example {P Q : Prop} (h : P ↔ Q) (hp : P) : Q := Iff.mp h hp
example {P Q : Prop} (h : P ↔ Q) (hq : Q) : P := Iff.mpr h hq
`);
  const run = spawnSync(lean, [file], { encoding: "utf8" });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
  assert.match(`${run.stdout}\n${run.stderr}`, /Iff\.mp/);
  assert.match(`${run.stdout}\n${run.stderr}`, /Iff\.mpr/);
  fs.rmSync(dir, { recursive: true, force: true });
}

assertInstallsIffEliminators();
assertIffEliminatorsTypecheckUseSites();
assertDirectDefinitionsAreChecked();
assertExactLeanIffEliminatorOracle();
console.log("KERNEL_IFF_ELIMINATORS_ACTIVE0=PASS exact-lean=PASS");
