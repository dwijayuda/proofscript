import assert from 'node:assert/strict';
import test from 'node:test';
import { loadKernel } from './local-kernel-loader.ts';
const K = loadKernel();
const { Environment, checkAndAddDeclaration, levelOfNat, infer, defEq, defEqWithTransparency, whnf, whnfWithTransparency, EquivManager } = K;
const C = (name, levels = []) => ({ tag: 'const', name, levels });
const S = n => ({ tag: 'sort', level: levelOfNat(n) });
const V = index => ({ tag: 'bvar', index });
const App = (fn, arg) => ({ tag: 'app', fn, arg });
const Pi = (domain, body) => ({ tag: 'pi', domain, body });
const Lam = (domain, body) => ({ tag: 'lam', domain, body });
const Let = (type, value, body) => ({ tag: 'let', type, value, body, nondep: false });
const env = new Environment();
const ax = (name, type) => checkAndAddDeclaration(env, { kind: 'axiom', name, type, levelParams: [] });
ax('A', S(1)); ax('a', C('A')); ax('b', C('A'));

test('equality cache is symmetric for structural term pairs', () => {
  const cache = new EquivManager();
  cache.set(C('a'), C('b'), false);
  assert.equal(cache.get(C('b'), C('a')), false);
});
test('equality cache partitions explicitly supplied semantic contexts', () => {
  const cache = new EquivManager();
  const scope = { environment: env, context: [], transparency: 'default', proofIrrelevance: true };
  cache.set(C('a'), C('b'), false, scope);
  assert.equal(cache.get(C('a'), C('b'), scope), false);
  for (const other of [
    { ...scope, environment: new Environment() },
    { ...scope, context: [{ name: 'x', type: C('A'), binderInfo: 'explicit' }] },
    { ...scope, transparency: 'reducible' },
    { ...scope, proofIrrelevance: false },
  ]) assert.equal(cache.get(C('a'), C('b'), other), undefined);
});
test('equality cache evicts older entries at its configured bound', () => {
  const cache = new EquivManager(2);
  cache.set(C('a'), C('a'), true);
  cache.set(C('b'), C('b'), true);
  cache.set(C('A'), C('A'), true);
  assert.equal(cache.get(C('a'), C('a')), undefined);
  assert.equal(cache.get(C('A'), C('A')), true);
});
test('equality query lifetime clears entries after the outer query', () => {
  const cache = new EquivManager();
  cache.withQuery(() => {
    cache.set(C('a'), C('a'), true);
    cache.withQuery(() => assert.equal(cache.get(C('a'), C('a')), true));
  });
  assert.equal(cache.get(C('a'), C('a')), undefined);
});
test('local type aliases unfold while their let body is typechecked', () => {
  const term = Let(S(1), C('A'), App(Lam(V(0), V(0)), C('a')));
  assert.equal(defEq(env, [], infer(env, [], term), C('A')), true);
});
test('a local function definition unfolds in a dependent type', () => {
  const term = Let(Pi(S(1), S(1)), Lam(S(1), V(0)), Lam(App(V(0), C('A')), V(0)));
  assert.equal(defEq(env, [], infer(env, [], term), Pi(C('A'), C('A'))), true);
});
test('nested local aliases preserve earlier de Bruijn bindings', () => {
  const term = Let(S(1), C('A'), Let(S(1), V(0), App(Lam(V(0), V(0)), C('a'))));
  assert.equal(defEq(env, [], infer(env, [], term), C('A')), true);
});
test('local definitions normalize beneath a later lambda binder', () => {
  const ctx = [{ name: 'T', type: S(1), value: C('A'), binderInfo: 'explicit' },
    { name: 'x', type: V(0), binderInfo: 'explicit' }];
  assert.deepEqual(whnf(env, ctx, V(1)), C('A'));
  assert.equal(defEq(env, ctx, infer(env, ctx, V(0)), C('A')), true);
});
checkAndAddDeclaration(env, { kind: 'inductive', name: 'One', levelParams: [], type: S(1),
  numParams: 0, numIndices: 0, constructors: [{ name: 'One.mk', type: C('One') }] });
ax('one1', C('One')); ax('one2', C('One'));
test('two arbitrary inhabitants of a unit-like type are definitionally equal', () => {
  assert.equal(defEq(env, [], C('one1'), C('one2')), true);
  assert.equal(defEq(env, [C('One'), C('One')], V(0), V(1)), true);
});
test('unit-like equality retains distinct types', () => {
  assert.equal(defEq(env, [], C('one1'), C('a')), false);
});
checkAndAddDeclaration(env, { kind: 'inductive', name: 'Box', levelParams: [], type: S(1),
  numParams: 0, numIndices: 0, constructors: [{ name: 'Box.mk', type: Pi(C('A'), C('Box')) }] });
ax('boxFn', Pi(C('A'), C('Box')));
test('projection congruence compares definitionally equal neutral majors', () => {
  const projection = expr => ({ tag: 'proj', typeName: 'Box', index: 0, expr });
  const betaA = App(Lam(C('A'), V(0)), C('a'));
  assert.equal(defEq(env, [], projection(App(C('boxFn'), betaA)), projection(App(C('boxFn'), C('a')))), true);
});
test('equality cache clears a failed query and skips oversized keys', () => {
  const cache = new EquivManager(4, 8);
  cache.set(C('a'), C('a'), true);
  assert.equal(cache.get(C('a'), C('a')), undefined);
  const normal = new EquivManager();
  assert.throws(() => normal.withQuery(() => {
    normal.set(C('a'), C('a'), true);
    throw new Error('cancel query');
  }), /cancel query/);
  assert.equal(normal.get(C('a'), C('a')), undefined);
});
test('local definition values participate in cache scope', () => {
  const cache = new EquivManager();
  const scope = value => ({ environment: env, transparency: 'default', proofIrrelevance: true,
    context: [{ name: 'x', type: C('A'), value, binderInfo: 'explicit' }] });
  cache.set(V(0), C('a'), true, scope(C('a')));
  assert.equal(cache.get(V(0), C('a'), scope(C('b'))), undefined);
});
test('supported environment mutations advance the equality-cache revision', () => {
  const e = new Environment();
  const first = e.cacheRevision;
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'CacheType', type: S(1), levelParams: [] });
  assert.notEqual(e.cacheRevision, first);
  const second = e.cacheRevision;
  e.replaceWith(new Environment());
  assert.notEqual(e.cacheRevision, second);
});

test('environment fork preserves the source cache revision before diverging', () => {
  const e = new Environment();
  checkAndAddDeclaration(e, { kind: 'axiom', name: 'ForkType', type: S(1), levelParams: [] });
  const fork = e.fork();
  assert.equal(fork.cacheRevision, e.cacheRevision);
  assert.ok(fork.findConstant('ForkType'));
  checkAndAddDeclaration(fork, { kind: 'axiom', name: 'ForkOnly', type: S(1), levelParams: [] });
  assert.notEqual(fork.cacheRevision, e.cacheRevision);
  assert.equal(e.findConstant('ForkOnly'), undefined);
});
test('structural reflexivity is decided before reduction', () => {
  const term = App(Lam(C('A'), V(0)), C('a'));
  const checker = new K.TypeChecker(env, { fuel: { maxSteps: 1, maxDepth: 100 } });
  assert.equal(checker.isDefEq(term, structuredClone(term)), true);
});
checkAndAddDeclaration(env, { kind: 'inductive', name: 'RecursiveBox', type: S(1), levelParams: [],
  numParams: 0, numIndices: 0, constructors: [{ name: 'RecursiveBox.mk', type: Pi(C('A'), Pi(C('RecursiveBox'), C('RecursiveBox'))) }] });
ax('recursiveBox', C('RecursiveBox'));
test('structure eta is restricted to nonrecursive structures', () => {
  const major = C('recursiveBox');
  const field = index => ({ tag: 'proj', typeName: 'RecursiveBox', index, expr: major });
  const expansion = App(App(C('RecursiveBox.mk'), field(0)), field(1));
  assert.equal(defEq(env, [], major, expansion), false);
});

checkAndAddDeclaration(env, { kind: 'opaque', name: 'opaqueA', levelParams: [], type: C('A'), value: C('a') });
test('opaque declarations remain closed even in all transparency for this trusted slice', () => {
  assert.deepEqual(whnfWithTransparency(env, [], C('opaqueA'), 'default'), C('opaqueA'));
  assert.deepEqual(whnfWithTransparency(env, [], C('opaqueA'), 'all'), C('opaqueA'));
  assert.equal(defEqWithTransparency(env, [], C('opaqueA'), C('a'), 'default'), false);
  assert.equal(defEqWithTransparency(env, [], C('opaqueA'), C('a'), 'all'), false);
});

test('equality cache skips structurally deep keys without throwing', () => {
  let term = C('a');
  for (let i = 0; i < 20000; i++) term = App(term, C('a'));
  const cache = new EquivManager(4, 65536, 128);
  assert.doesNotThrow(() => cache.set(term, term, true));
  assert.doesNotThrow(() => assert.equal(cache.get(term, term), undefined));
});
