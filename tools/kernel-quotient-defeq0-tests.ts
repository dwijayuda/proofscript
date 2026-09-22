import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  Environment,
  checkAndAddDeclaration,
  installCorePrimitives,
  levelOfNat,
  levelParam,
  infer,
  kernelWhnf,
  defEq,
} from '../packages/kernel/dist/index.js';

const L0 = levelOfNat(0);
const L1 = levelOfNat(1);
const u = levelParam('u');
const S = (level: any) => ({ tag: 'sort', level } as const);
const C = (name: string, levels: any[] = []) => ({ tag: 'const', name, levels } as const);
const B = (index: number) => ({ tag: 'bvar', index } as const);
const App = (fn: any, arg: any) => ({ tag: 'app', fn, arg } as const);
const Apps = (fn: any, args: any[]) => args.reduce(App, fn);
const Pi = (domain: any, body: any, binderInfo: any = 'explicit') => ({ tag: 'pi', domain, body, binderInfo } as const);
const Lam = (domain: any, body: any, binderInfo: any = 'explicit') => ({ tag: 'lam', domain, body, binderInfo } as const);
const Arrow = (domain: any, body: any) => Pi(domain, body, 'explicit');

function envWithQuotAlias(): Environment {
  const env = new Environment();
  installCorePrimitives(env, { quotients: true });

  // R.{u} {α : Sort u} : α -> α -> Prop := Eq.{u} α
  const rType = Pi(S(u), Arrow(B(0), Arrow(B(1), S(L0))), 'implicit');
  const rValue = Lam(S(u), Apps(C('Eq', [u]), [B(0)]), 'implicit');
  checkAndAddDeclaration(env, { kind: 'definition', name: 'R', levelParams: ['u'], type: rType, value: rValue, reducibility: 'regular' });

  checkAndAddDeclaration(env, { kind: 'axiom', name: 'A', levelParams: [], type: S(L1) });
  checkAndAddDeclaration(env, { kind: 'axiom', name: 'a', levelParams: [], type: C('A') });
  return env;
}

const env = envWithQuotAlias();
const A = C('A');
const a = C('a');
const eqA = Apps(C('Eq', [L1]), [A]);
const rA = Apps(C('R', [L1]), [A]);
const major = Apps(C('Quot.mk', [L1]), [A, eqA, a]);

const idA = Lam(A, B(0));
const liftSound = Lam(A, Lam(A, Lam(Apps(rA, [B(1), B(0)]), B(0))));
const lift = Apps(C('Quot.lift', [L1, L1]), [A, rA, A, idA, liftSound, major]);
assert.ok(defEq(env, [], infer(env, [], lift), A), 'Quot.lift alias-relation application must typecheck');
assert.ok(defEq(env, [], kernelWhnf(env, lift), a), 'Quot.lift must reduce when the Quot.mk relation is definitionally equal to the eliminator relation');

const motive = Lam(Apps(C('Quot', [L1]), [A, rA]), Apps(C('Eq', [L1]), [A, a, a]));
const refl = Apps(C('Eq.refl', [L1]), [A, a]);
const indWitness = Lam(A, refl);
const ind = Apps(C('Quot.ind', [L1]), [A, rA, motive, indWitness, major]);
assert.ok(defEq(env, [], infer(env, [], ind), Apps(C('Eq', [L1]), [A, a, a])), 'Quot.ind alias-relation application must typecheck');
assert.ok(defEq(env, [], kernelWhnf(env, ind), refl), 'Quot.ind must reduce when the Quot.mk relation is definitionally equal to the eliminator relation');

const lean = process.env.PROOFSCRIPT_LEAN_BIN;
if (lean) {
  const code = `universe u\n\ndef R {α : Sort u} : α -> α -> Prop := @Eq α\n\ndef liftIdAlias {α : Sort u} (a : α) : Quot (@R α) := Quot.mk (@Eq α) a\nexample {α : Sort u} (a : α) : Quot.lift (r := @R α) (fun x => x) (fun _ _ h => h) (liftIdAlias a) = a := rfl\nexample {α : Sort u} (a : α) : @Quot.ind α (@R α) (fun _ => a = a) (fun _ => rfl) (Quot.mk (@Eq α) a) = rfl := by rfl\n`;
  const run = spawnSync(lean, ['--stdin'], { input: code, encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(run.stdout);
    console.error(run.stderr);
    process.exit(1);
  }
}

console.log('KERNEL_QUOTIENT_DEFEQ0=PASS exact-lean=PASS');
