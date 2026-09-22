import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Environment, checkAndAddDeclaration, kernelWhnf, sameTerm, pretty, levelOfNat } from '../packages/kernel/dist/index.js';

const L1 = levelOfNat(1);
const S = (level: any) => ({ tag: 'sort', level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: 'const', name, levels } as const);
const B = (index: number) => ({ tag: 'bvar', index } as const);
const App = (fn: any, arg: any) => ({ tag: 'app', fn, arg } as const);
const Apps = (fn: any, args: any[]) => args.reduce(App, fn);
const Pi = (domain: any, body: any, binderInfo = 'explicit') => ({ tag: 'pi', domain, body, binderInfo } as const);
const Lam = (domain: any, body: any, binderInfo = 'explicit') => ({ tag: 'lam', domain, body, binderInfo } as const);
const Let = (type: any, value: any, body: any) => ({ tag: 'let', type, value, body, nondep: false } as const);
const D = (name: string, type: any, value: any) => ({ kind: 'definition', name, levelParams: [], type, value, reducibility: 'regular' } as const);

const baseOpts = {
  recursorProfile: 'lean4331', allowEmptyInductives: true, allowProjections: true,
  allowStructureEta: true, allowHigherOrderPositiveRecursion: true,
  allowIndexedRecursiveRecursors: true, allowIndexedProjections: true,
  allowPropElimination: true, allowRecursorK: true, allowInductiveUniverseChecks: true,
  allowDependentConstructorFields: true, allowTelescopeTerms: true,
  allowLeanRecursorMinorOrder: true, allowUniformParameterDefEq: true,
  allowRecursorFamilyBinderInfo: true, allowConversionFinalAudit: true,
  allowResourceBounds: true, allowProjectionConformance: true,
};
function env(extra: Record<string, unknown> = {}) {
  const e = new Environment({ ...baseOpts, ...extra });
  for (const d of [
    { kind: 'axiom', name: 'Impl.N', levelParams: [], type: S(L1) },
    { kind: 'axiom', name: 'Impl.n0', levelParams: [], type: C('Impl.N') },
    { kind: 'axiom', name: 'Impl.A', levelParams: [], type: S(L1) },
  ] as any[]) checkAndAddDeclaration(e, d);
  return e;
}
function assertWhnfEq(e: any, label: string, a: any, b: any) {
  const wa = kernelWhnf(e, a), wb = kernelWhnf(e, b);
  assert.ok(sameTerm(wa, wb), `${label}\nactual ${pretty(wa)}\nexpected ${pretty(wb)}`);
}

const letParam = Let(S(L1), B(0), B(0));
const R = { kind: 'inductive', name: 'Impl.R', levelParams: [], type: Pi(S(L1), S(L1)), numParams: 1, numIndices: 0, constructors: [
  { name: 'Impl.R.mk', type: Pi(S(L1), Pi(App(C('Impl.R'), letParam), App(C('Impl.R'), B(1)))) },
] } as any;

{
  const e = env();
  checkAndAddDeclaration(e, R);
  const rec = e.findConstant('Impl.R.rec');
  assert.equal(rec?.kind, 'recInfo');
  assert.equal((rec as any).metadata.status, 'typed-simple-nonindexed', 'let-normalized recursive parameter must synthesize a typed recursor, not a stub');
  const ty = App(C('Impl.R'), C('Impl.A'));
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.rx', levelParams: [], type: ty } as any);
  const motive = Lam(ty, C('Impl.N'));
  const minor = Lam(ty, Lam(C('Impl.N'), B(0)));
  assertWhnfEq(
    e,
    'let-normalized recursive field parameter must iota-reduce through the generated recursor',
    Apps(C('Impl.R.rec', [L1]), [C('Impl.A'), motive, minor, Apps(C('Impl.R.mk'), [C('Impl.A'), C('Impl.rx')])]),
    Apps(C('Impl.R.rec', [L1]), [C('Impl.A'), motive, minor, C('Impl.rx')]),
  );
}

{
  const e = env({ allowUniformParameterDefEq: false });
  assert.throws(
    () => checkAndAddDeclaration(e, R),
    /non-uniform recursive parameter 0|stubbed|unsupported|type mismatch/,
    'feature gate disabled must reject instead of silently weakening the recursor claim',
  );
}


{
  const e = env();
  const Choose = { kind: 'inductive', name: 'Impl.Choose', levelParams: [], type: Pi(S(L1), S(L1)), numParams: 1, numIndices: 0, constructors: [
    { name: 'Impl.Choose.mk', type: Pi(S(L1), Pi(Pi(B(0), Pi(B(1), B(2))), App(C('Impl.Choose'), B(1)))) },
  ] } as any;
  checkAndAddDeclaration(e, Choose);
  const rec = e.findConstant('Impl.Choose.rec');
  assert.equal(rec?.kind, 'recInfo');
  assert.equal((rec as any).metadata.status, 'typed-simple-nonindexed', 'function-valued nonrecursive constructor fields must synthesize typed recursors');
}



{
  const e = env();
  const Le = { kind: 'inductive', name: 'Impl.Le', levelParams: [], type: Pi(C('Impl.N'), Pi(C('Impl.N'), S(levelOfNat(0)))), numParams: 1, numIndices: 1, constructors: [
    { name: 'Impl.Le.refl', type: Pi(C('Impl.N'), Apps(C('Impl.Le'), [B(0), B(0)]), 'implicit') },
    { name: 'Impl.Le.step', type: Pi(C('Impl.N'), Pi(C('Impl.N'), Pi(Apps(C('Impl.Le'), [B(1), B(0)]), Apps(C('Impl.Le'), [B(2), App(C('Impl.succ'), B(1))])))) },
  ] } as any;
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.succ', levelParams: [], type: Pi(C('Impl.N'), C('Impl.N')) } as any);
  checkAndAddDeclaration(e, Le);
  const rec = e.findConstant('Impl.Le.rec');
  assert.equal(rec?.kind, 'recInfo');
  assert.equal((rec as any).metadata.status, 'typed-simple-indexed');
  assert.deepEqual((rec as any).levelParams, [], 'multi-constructor Prop-valued indexed recursor must be Prop-only like Lean Nat.le.rec');
  const summary = (await import('../packages/kernel/dist/index.js')).checkCoreDeclarations([
    { kind: 'axiom', name: 'Impl.N', levelParams: [], type: S(L1) } as any,
    { kind: 'axiom', name: 'Impl.succ', levelParams: [], type: Pi(C('Impl.N'), C('Impl.N')) } as any,
    Le,
  ], 'KERNEL-level-instantiation-conformance1' as any);
  assert.equal(summary.status, 'accepted', summary.message ?? 'profile should enable indexed recursive recursor admission');
}


{
  const e = env();
  const U = { tag: 'param', name: 'u' } as const;
  const EqDecl = { kind: 'inductive', name: 'Eq', levelParams: ['u'], type: Pi(S(U), Pi(B(0), Pi(B(1), S(levelOfNat(0))))), numParams: 2, numIndices: 1, constructors: [
    { name: 'Eq.refl', type: Pi(S(U), Pi(B(0), Apps(C('Eq', [U]), [B(1), B(0), B(0)]), 'explicit'), 'implicit') },
  ] } as any;
  checkAndAddDeclaration(e, EqDecl);
  const rec = e.findConstant('Eq.rec');
  assert.equal(rec?.kind, 'recInfo');
  assert.deepEqual((rec as any).levelParams, ['u_motive', 'u'], 'Lean orders recursor universe parameters as motive level first, then family universe parameters');
}


{
  const e = env();
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.T', levelParams: [], type: S(L1) } as any);
  checkAndAddDeclaration(e, D('Impl.TAlias', S(L1), C('Impl.T')) as any);
  const Box = { kind: 'inductive', name: 'Impl.Box', levelParams: [], type: Pi(S(L1), S(L1)), numParams: 1, numIndices: 0, constructors: [
    { name: 'Impl.Box.mk', type: Pi(S(L1), App(C('Impl.Box'), B(0))) },
  ] } as any;
  checkAndAddDeclaration(e, Box);
  const familyAtT = App(C('Impl.Box'), C('Impl.T'));
  const app = Apps(C('Impl.Box.rec', [L1]), [C('Impl.T'), Lam(familyAtT, C('Impl.N')), C('Impl.n0'), App(C('Impl.Box.mk'), C('Impl.TAlias'))]);
  assertWhnfEq(e, 'recursor iota must compare constructor parameters modulo delta/zeta normalization', app, C('Impl.n0'));
}


{
  const e = env();
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.F', levelParams: [], type: Pi(C('Impl.N'), S(L1)) } as any);
  checkAndAddDeclaration(e, D('Impl.nAlias', C('Impl.N'), C('Impl.n0')) as any);
  const Box = { kind: 'inductive', name: 'Impl.BoxApp', levelParams: [], type: Pi(S(L1), S(L1)), numParams: 1, numIndices: 0, constructors: [
    { name: 'Impl.BoxApp.mk', type: Pi(S(L1), App(C('Impl.BoxApp'), B(0))) },
  ] } as any;
  checkAndAddDeclaration(e, Box);
  const paramExpected = App(C('Impl.F'), C('Impl.n0'));
  const paramActual = App(C('Impl.F'), C('Impl.nAlias'));
  const app = Apps(C('Impl.BoxApp.rec', [L1]), [paramExpected, Lam(App(C('Impl.BoxApp'), paramExpected), C('Impl.N')), C('Impl.n0'), App(C('Impl.BoxApp.mk'), paramActual)]);
  assertWhnfEq(e, 'recursor iota must compare nested constructor parameters modulo delta-normalized arguments', app, C('Impl.n0'));
}


{
  const e = env();
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.succ2', levelParams: [], type: Pi(C('Impl.N'), C('Impl.N')) } as any);
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'Impl.PRel', levelParams: [], type: Pi(C('Impl.N'), Pi(C('Impl.N'), S(levelOfNat(0)))) } as any);
  checkAndAddDeclaration(e, D('Impl.QRel', Pi(C('Impl.N'), Pi(C('Impl.N'), S(levelOfNat(0)))), Lam(C('Impl.N'), Lam(C('Impl.N'), Apps(C('Impl.PRel'), [App(C('Impl.succ2'), B(1)), B(0)])))) as any);
  const DecLike = { kind: 'inductive', name: 'Impl.DecLike', levelParams: [], type: Pi(S(levelOfNat(0)), S(L1)), numParams: 1, numIndices: 0, constructors: [
    { name: 'Impl.DecLike.mk', type: Pi(S(levelOfNat(0)), App(C('Impl.DecLike'), B(0))) },
  ] } as any;
  checkAndAddDeclaration(e, DecLike);
  const propExpected = Apps(C('Impl.QRel'), [C('Impl.n0'), C('Impl.n0')]);
  const propActual = Apps(C('Impl.PRel'), [App(C('Impl.succ2'), C('Impl.n0')), C('Impl.n0')]);
  const app = Apps(C('Impl.DecLike.rec', [L1]), [propExpected, Lam(App(C('Impl.DecLike'), propExpected), C('Impl.N')), C('Impl.n0'), App(C('Impl.DecLike.mk'), propActual)]);
  assertWhnfEq(e, 'recursor iota must compare constructor parameters after reducing application heads', app, C('Impl.n0'));
}

const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (lean) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-nonmutual-defeq-'));
  const file = path.join(dir, 'LetParamRecursor.lean');
  fs.writeFileSync(file, `set_option linter.unusedVariables false\nuniverse u\naxiom N : Type\ninductive R (A : Type u) : Type u where\n  | mk : (let B : Type u := A; R B) → R A\naxiom A : Type\naxiom rx : R A\nexample : R.rec (motive := fun _ => N) (fun x ih => ih) (R.mk rx) = R.rec (motive := fun _ => N) (fun x ih => ih) rx := rfl\n`);
  const r = spawnSync(lean, [file], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`KERNEL_NONMUTUAL_RECURSOR_DEFEQ0=PASS${lean ? ' exact-lean=PASS' : ' exact-lean=SKIPPED'}`);
