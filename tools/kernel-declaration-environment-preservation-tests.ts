import assert from 'node:assert/strict';
import {
  Environment,
  KernelError,
  checkAndAddDeclaration,
  infer,
  kernelWhnf,
  LevelZero,
  levelParam,
  levelSucc,
  levelMax,
  levelIMax,
  levelStructuralEq,
  prettyLevel,
} from '../packages/kernel/dist/index.js';

const U = levelParam('u');
const V = levelParam('v');
const one = levelSucc(LevelZero);
const three = levelSucc(levelSucc(one));
const maxUV = levelMax(U,V);

const Sort = level => ({ tag:'sort', level });
const Const = (name, levels=[]) => ({ tag:'const', name, levels });

function assertLevelEq(actual, expected, label) {
  assert.ok(levelStructuralEq(actual, expected), `${label}: expected ${prettyLevel(expected)}, got ${prettyLevel(actual)}`);
}

// Ordinary direct type lookup: declaration-type universe instantiation must use
// the same v71 cheap max/imax rebuilding that the formal bridge now models.
const env = new Environment();
checkAndAddDeclaration(env, {
  kind:'axiom',
  name:'AxiomaticSort',
  levelParams:['u','v'],
  type: Sort(levelSucc(maxUV)),
});
let ty = infer(env, [], Const('AxiomaticSort', [one, three]));
assert.equal(ty.tag, 'sort');
assertLevelEq(ty.level, levelSucc(three), 'ordinary const type lookup max simplification');

// Delta lookup: only regular definitions unfold, and their body level
// instantiation also goes through the v71 level/expression substitution path.
checkAndAddDeclaration(env, {
  kind:'definition',
  name:'TransparentSort',
  levelParams:['u','v'],
  type: Sort(levelSucc(maxUV)),
  value: Sort(maxUV),
  reducibility:'regular',
});
let wh = kernelWhnf(env, Const('TransparentSort', [one, three]));
assert.equal(wh.tag, 'sort');
assertLevelEq(wh.level, three, 'definition delta body max simplification');

// The exact imax case that separated v71 from historical v70 must be visible at
// installed declaration lookup, not merely at a standalone helper call.
checkAndAddDeclaration(env, {
  kind:'definition',
  name:'TransparentIMaxSort',
  levelParams:['u','v'],
  type: Sort(levelSucc(levelIMax(U,V))),
  value: Sort(levelIMax(U,V)),
  reducibility:'regular',
});
wh = kernelWhnf(env, Const('TransparentIMaxSort', [LevelZero, one]));
assert.equal(wh.tag, 'sort');
assertLevelEq(wh.level, one, 'definition delta body imax simplification');

ty = infer(env, [], Const('TransparentIMaxSort', [LevelZero, one]));
assert.equal(ty.tag, 'sort');
assertLevelEq(ty.level, levelSucc(one), 'definition type imax simplification');

// Transparency boundary: opaque values are checked and installed for type lookup,
// but must not be exposed through delta reduction.
checkAndAddDeclaration(env, {
  kind:'opaque',
  name:'OpaqueSort',
  levelParams:['u','v'],
  type: Sort(levelSucc(maxUV)),
  value: Sort(maxUV),
});
assert.deepEqual(kernelWhnf(env, Const('OpaqueSort', [one, three])), Const('OpaqueSort', [one, three]));
ty = infer(env, [], Const('OpaqueSort', [one, three]));
assert.equal(ty.tag, 'sort');
assertLevelEq(ty.level, levelSucc(three), 'opaque direct type lookup still works');

// Example declarations are proof declarations in the current checked Core
// model. They must be Prop-valued, they are tracked in the checked environment,
// and invalid data-valued examples must reject without mutating the environment.
checkAndAddDeclaration(env, { kind:'axiom', name:'ExampleP', levelParams:[], type: Sort(LevelZero) });
checkAndAddDeclaration(env, { kind:'axiom', name:'exampleProof', levelParams:[], type: Const('ExampleP') });
checkAndAddDeclaration(env, {
  kind:'example',
  name:'ExampleProof',
  levelParams:[],
  type: Const('ExampleP'),
  value: Const('exampleProof'),
});
assert.ok(env.get('ExampleProof'));
const beforeBadExample = env.names();
assert.throws(() => checkAndAddDeclaration(env, {
  kind:'example',
  name:'ExampleSort',
  levelParams:['u','v'],
  type: Sort(levelSucc(maxUV)),
  value: Sort(maxUV),
}), /type must be a proposition/);
assert.deepEqual(env.names(), beforeBadExample);
assert.throws(() => infer(env, [], Const('ExampleSort', [one, three])), KernelError);

console.log('PASS KERNEL declaration-environment preservation phase 1: ordinary type/delta lookup, v71 level instantiation, opaque/example boundaries');
