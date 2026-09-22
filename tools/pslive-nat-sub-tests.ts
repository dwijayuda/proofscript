#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildJsFixture,
  buildTsFixture,
  compileTypeScriptFixture,
  createPsliveFixture,
  expectPsliveRejected,
  requireFixtureModule,
} from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-nat-sub-', {
  fileName: 'NatSub.ps',
  source: `
function dec(x: Nat): Nat := { x - 1 }
def fiveMinusTwo: Nat := { 5 - 2 }
def twoMinusFive: Nat := { 2 - 5 }
def mixedPrecedence: Nat := { 8 - 2 * 3 }
def leftAssociative: Nat := { 10 - 3 - 2 }
def grouped: Nat := { 10 - (3 - 2) }
def viaFunction: Nat := { dec 4 }
def viaNatSub: Nat := { Nat.sub 9 4 }
def viaNatPred: Nat := { Nat.pred 7 }
theorem five_minus_two_eq_three: fiveMinusTwo = 3 := by rfl
theorem two_minus_five_eq_zero: twoMinusFive = 0 := by rfl
theorem mixed_precedence_eq_two: mixedPrecedence = 2 := by rfl
theorem left_assoc_eq_five: leftAssociative = 5 := by rfl
theorem grouped_eq_nine: grouped = 9 := by rfl
theorem via_nat_sub_eq_five: viaNatSub = 5 := by rfl
theorem via_nat_pred_eq_six: viaNatPred = 6 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'nat-sub.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'mixedPrecedence'), 'Nat subtraction declarations must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.fiveMinusTwo, 3n);
assert.equal(jsModule.twoMinusFive, 0n);
assert.equal(jsModule.mixedPrecedence, 2n);
assert.equal(jsModule.leftAssociative, 5n);
assert.equal(jsModule.grouped, 9n);
assert.equal(jsModule.viaFunction, 3n);
assert.equal(jsModule.viaNatSub, 5n);
assert.equal(jsModule.viaNatPred, 6n);

const { outPath: tsOut } = buildTsFixture(fixture, 'nat-sub.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Nat_sub\(5n\)\(2n\)/, 'generated TS should lower - to checked Nat.sub runtime semantics');
assert.match(tsSource, /Nat_pred\(7n\)/, 'generated TS should expose Nat.pred runtime semantics for checked bootstrap Nat.pred');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.fiveMinusTwo, 3n);
assert.equal(compiled.twoMinusFive, 0n);
assert.equal(compiled.mixedPrecedence, 2n);
assert.equal(compiled.leftAssociative, 5n);
assert.equal(compiled.grouped, 9n);
assert.equal(compiled.viaFunction, 3n);
assert.equal(compiled.viaNatSub, 5n);
assert.equal(compiled.viaNatPred, 6n);

const bad = createPsliveFixture('proofscript-nat-sub-bad-', {
  fileName: 'BoolSubRejected.ps',
  source: 'def bad: Nat := { true - 1 }\n',
});
const rejected = expectPsliveRejected(['check', bad.source, '--json']);
assert.match(rejected.message, /application argument does not have the expected Pi-domain type|literal 'Nat' expected type|literal only at expected type Bool/i);

console.log('PSLIVE_NAT_SUB=PASS');
