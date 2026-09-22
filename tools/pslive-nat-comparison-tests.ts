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

const fixture = createPsliveFixture('proofscript-nat-comparison-', {
  fileName: 'NatComparison.ps',
  source: `
def eqTrue: Bool := { 3 == 3 }
def eqFalse: Bool := { 3 == 4 }
def leTrue: Bool := { 2 <= 5 }
def leEq: Bool := { 5 <= 5 }
def leFalse: Bool := { 6 <= 5 }
def ltTrue: Bool := { 2 < 5 }
def ltFalseEq: Bool := { 5 < 5 }
def ltFalseGt: Bool := { 7 < 5 }
def geTrue: Bool := { 5 >= 2 }
def gtTrue: Bool := { 5 > 2 }
def precedence: Bool := { 2 + 3 < 2 * 4 }
def chooseSmall: Nat := { if 2 < 3 then 10 else 20 }
def chooseEq: Nat := { if 4 == 4 then 1 else 0 }
def viaNatBeq: Bool := { Nat.beq 7 7 }
def viaNatLeb: Bool := { Nat.leb 4 8 }
def viaNatLtb: Bool := { Nat.ltb 4 8 }
theorem eq_true_rfl: eqTrue = true := by rfl
theorem eq_false_rfl: eqFalse = false := by rfl
theorem le_true_rfl: leTrue = true := by rfl
theorem le_false_rfl: leFalse = false := by rfl
theorem lt_true_rfl: ltTrue = true := by rfl
theorem choose_small_rfl: chooseSmall = 10 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'nat-comparison.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'chooseSmall'), 'Nat comparison declarations must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.eqTrue, true);
assert.equal(jsModule.eqFalse, false);
assert.equal(jsModule.leTrue, true);
assert.equal(jsModule.leEq, true);
assert.equal(jsModule.leFalse, false);
assert.equal(jsModule.ltTrue, true);
assert.equal(jsModule.ltFalseEq, false);
assert.equal(jsModule.ltFalseGt, false);
assert.equal(jsModule.geTrue, true);
assert.equal(jsModule.gtTrue, true);
assert.equal(jsModule.precedence, true);
assert.equal(jsModule.chooseSmall, 10n);
assert.equal(jsModule.chooseEq, 1n);
assert.equal(jsModule.viaNatBeq, true);
assert.equal(jsModule.viaNatLeb, true);
assert.equal(jsModule.viaNatLtb, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'nat-comparison.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Nat_beq\(3n\)\(3n\)/, 'generated TS should lower == to checked Nat.beq runtime semantics');
assert.match(tsSource, /Nat_leb\(2n\)\(5n\)/, 'generated TS should lower <= to checked Nat.leb runtime semantics');
assert.match(tsSource, /Nat_ltb\(2n\)\(5n\)/, 'generated TS should lower < to checked Nat.ltb runtime semantics');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.eqTrue, true);
assert.equal(compiled.leFalse, false);
assert.equal(compiled.chooseSmall, 10n);

const chained = createPsliveFixture('proofscript-nat-comparison-bad-', {
  fileName: 'ChainedComparisonRejected.ps',
  source: 'def bad: Bool := { 1 < 2 < 3 }\n',
});
const rejected = expectPsliveRejected(['check', chained.source, '--json']);
assert.match(rejected.message, /chained Nat comparison/i);

console.log('PSLIVE_NAT_COMPARISON=PASS');
