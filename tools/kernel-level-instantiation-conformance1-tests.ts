import assert from 'node:assert/strict';
import * as codec from '../packages/kernel-codec/dist/index.js';
import {
  Environment, checkCoreDeclarations, checkAndAddDeclaration, instantiateLevel, instantiateTermLevels,
  LevelZero, levelParam, levelSucc, levelIMax, levelMax, levelStructuralEq,
} from '../packages/kernel/dist/index.js';

const U=levelParam('u'), V=levelParam('v');
const one=levelSucc(LevelZero), three=levelSucc(levelSucc(one));

// Minimal exact-Lean structural counterexamples for the historical v70 helper.
const imaxOut=instantiateLevel(levelIMax(U,V),['u','v'],[LevelZero,one]);
assert.ok(levelStructuralEq(imaxOut,one),'v71 must simplify imax 0 1 to 1 during instantiation');
const maxOut=instantiateLevel(levelMax(U,V),['u','v'],[one,three]);
assert.ok(levelStructuralEq(maxOut,three),'v71 must apply Lean mkLevelMax\' cheap simplification');

const term={tag:'const',name:'C',levels:[levelIMax(U,V),levelMax(U,V)]};
const termOut=instantiateTermLevels(term,['u','v'],[LevelZero,one]);
assert.ok(levelStructuralEq(termOut.levels[0],one));
assert.ok(levelStructuralEq(termOut.levels[1],one));

// ProofScript intentionally requires exact arity at the trusted use boundary.
assert.throws(()=>instantiateLevel(U,['u','v'],[LevelZero]),/universe arity mismatch/);

// Trusted declarations exclude duplicate universe parameter names, which makes
// the shared-domain paired substitution map unambiguous.
const duplicate={kind:'axiom',name:'A',levelParams:['u','u'],type:{tag:'sort',level:one}};
assert.throws(()=>checkAndAddDeclaration(new Environment(),duplicate),/duplicate universe parameter/);

// v71 identity + codec round trip.
const art=codec.makeKernelLevelInstantiationConformanceArtifact([]);
assert.equal(art.formatVersion,71);
assert.equal(art.implementationProfile,'KERNEL-level-instantiation-conformance1');
const round=codec.decodeArtifact(JSON.parse(JSON.stringify(art)));
assert.equal(round.formatVersion,71);
assert.equal(round.implementationProfile,'KERNEL-level-instantiation-conformance1');
assert.equal(checkCoreDeclarations(round.declarations,round.implementationProfile).status,'accepted');

// Historical v70 remains replayable rather than silently re-labelled.
const old=codec.makeKernelProjectionConformanceArtifact([]);
assert.equal(old.formatVersion,70);
assert.equal(codec.decodeArtifact(JSON.parse(JSON.stringify(old))).implementationProfile,'KERNEL-projection-conformance1');

console.log('PASS KERNEL-level-instantiation-conformance1: Core v71 identity/codec, exact cheap substitution rebuilding, boundary preconditions, and v70 historical replay');
