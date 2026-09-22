import assert from 'node:assert/strict';
import test from 'node:test';
import { loadKernel } from './local-kernel-loader.ts';

const { Environment, checkAndAddDeclaration, defEq, infer, whnf, levelOfNat, levelParam } = loadKernel();
const sort = n => ({ tag: 'sort', level: levelOfNat(n) });
const c = (name, levels = []) => ({ tag: 'const', name, levels });
const v = index => ({ tag: 'bvar', index });
const app = (fn, arg) => ({ tag: 'app', fn, arg });
const pi = (domain, body, binderInfo = 'explicit') => ({ tag: 'pi', domain, body, binderInfo });
const lam = (domain, body, binderInfo = 'explicit') => ({ tag: 'lam', domain, body, binderInfo });
const proj = (typeName, index, expr) => ({ tag: 'proj', typeName, index, expr });
const env = new Environment();
const ax = (name, type) => checkAndAddDeclaration(env, { kind: 'axiom', name, type, levelParams: [] });
ax('A', sort(1)); ax('a', c('A')); ax('f', pi(c('A'), c('A')));
ax('B', pi(c('A'), sort(1))); ax('df', pi(c('A'), app(c('B'), v(0))));

test('function eta is symmetric for a global function', () => {
  const expanded = lam(c('A'), app(c('f'), v(0)));
  assert.equal(defEq(env, [], c('f'), expanded), true);
  assert.equal(defEq(env, [], expanded, c('f')), true);
});
test('function eta shifts a local function under the new binder', () => {
  assert.equal(defEq(env, [pi(c('A'), c('A'))], v(0), lam(c('A'), app(v(1), v(0)))), true);
});
test('function eta supports dependent codomains', () => {
  assert.equal(defEq(env, [], c('df'), lam(c('A'), app(c('df'), v(0)))), true);
});
test('function eta preserves unequal function bodies', () => {
  assert.equal(defEq(env, [], c('f'), lam(c('A'), c('a'))), false);
});
for (const tag of ['pi', 'lam']) test(`${tag} equality ignores elaborator binder annotations`, () => {
  const make = tag === 'pi' ? pi : lam;
  const body = tag === 'pi' ? c('A') : v(0);
  for (const bi of ['implicit', 'strictImplicit', 'instImplicit']) {
    assert.equal(defEq(env, [], make(c('A'), body), make(c('A'), body, bi)), true);
  }
});

// Pack : Type 1, Pack.mk : (A : Type) -> A -> Pack.
checkAndAddDeclaration(env, { kind: 'inductive', name: 'Pack', levelParams: [], type: sort(2),
  numParams: 0, numIndices: 0,
  constructors: [{ name: 'Pack.mk', type: pi(sort(1), pi(v(0), c('Pack'))) }] });
ax('p', c('Pack'));
test('dependent projection substitutes earlier projections into the field type', () => {
  assert.deepEqual(infer(env, [], proj('Pack', 1, c('p'))), proj('Pack', 0, c('p')));
});
test('dependent projection reduces on a checked constructor', () => {
  const packed = app(app(c('Pack.mk'), c('A')), c('a'));
  assert.deepEqual(whnf(env, [], proj('Pack', 1, packed)), c('a'));
  assert.equal(defEq(env, [], infer(env, [], proj('Pack', 1, packed)), c('A')), true);
});
test('dependent projection retains an outer local context', () => {
  assert.deepEqual(infer(env, [c('Pack')], proj('Pack', 1, v(0))), proj('Pack', 0, v(0)));
});
// Higher-ranked field exercises substitution underneath a binder.
checkAndAddDeclaration(env, { kind: 'inductive', name: 'Ops', levelParams: [], type: sort(2),
  numParams: 0, numIndices: 0,
  constructors: [{ name: 'Ops.mk', type: pi(sort(1), pi(pi(v(0), v(1)), c('Ops'))) }] });
ax('ops', c('Ops'));
test('projection supports function-valued dependent fields', () => {
  const field = proj('Ops', 0, c('ops'));
  assert.deepEqual(infer(env, [], proj('Ops', 1, c('ops'))), pi(field, field));
});
const u = levelParam('u');
const su = { tag: 'sort', level: u };
checkAndAddDeclaration(env, { kind: 'inductive', name: 'BoxU', levelParams: ['u'], type: pi(su, su),
  numParams: 1, numIndices: 0,
  constructors: [{ name: 'BoxU.mk', type: pi(su, pi(v(0), app(c('BoxU', [u]), v(1)))) }] });
test('projection instantiates universe and uniform parameters', () => {
  const major = app(app(c('BoxU.mk', [levelOfNat(1)]), c('A')), c('a'));
  assert.deepEqual(infer(env, [], proj('BoxU', 0, major)), c('A'));
});
ax('P', sort(0)); ax('hp', c('P'));
checkAndAddDeclaration(env, { kind: 'inductive', name: 'Hidden', levelParams: [], type: sort(0),
  numParams: 0, numIndices: 0,
  constructors: [{ name: 'Hidden.mk', type: pi(c('A'), pi(c('P'), c('Hidden'))) }] });
ax('hidden', c('Hidden'));
test('Prop structure permits a proof field after an unused data field', () => {
  assert.deepEqual(infer(env, [], proj('Hidden', 1, c('hidden'))), c('P'));
});
test('Prop structure does not expose its data field', () => {
  assert.throws(() => infer(env, [], proj('Hidden', 0, c('hidden'))), /cannot extract a non-proposition field/);
});
test('projection accepts a universe-polymorphic box specialized to Prop', () => {
  const boxed = app(app(c('BoxU.mk', [levelOfNat(0)]), c('P')), c('hp'));
  assert.deepEqual(infer(env, [], proj('BoxU', 0, boxed)), c('P'));
});
test('projection requires a proof field when the universe may be Prop', () => {
  const ctx = [su, app(c('BoxU', [u]), v(0))];
  assert.throws(() => infer(env, ctx, proj('BoxU', 0, v(0))), /cannot extract a non-proposition field/);
});
