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

const fixture = createPsliveFixture('proofscript-int-arith-', {
  fileName: 'IntArithmetic.ps',
  source: String.raw`
def negFive: Int := { Int.neg(5) }
def sumInt: Int := { Int.add(-2, 5) }
def diffInt: Int := { Int.sub(-2, 5) }
def nestedInt: Int := { Int.add(Int.neg(3), Int.sub(10, 4)) }
def sameInt: Bool := { Int.beq(-3, Int.neg(3)) }
def differentInt: Bool := { Int.beq(-3, 3) }

theorem neg_five_rfl: negFive = -5 := by rfl
theorem sum_int_rfl: sumInt = 3 := by rfl
theorem diff_int_rfl: diffInt = -7 := by rfl
theorem nested_int_rfl: nestedInt = 3 := by rfl
theorem same_int_rfl: sameInt = Bool.true := by rfl
theorem different_int_rfl: differentInt = Bool.false := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'int-arith.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'nestedInt'), 'Int arithmetic result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.negFive, -5n);
assert.equal(jsModule.sumInt, 3n);
assert.equal(jsModule.diffInt, -7n);
assert.equal(jsModule.nestedInt, 3n);
assert.equal(jsModule.sameInt, true);
assert.equal(jsModule.differentInt, false);

const { outPath: tsOut } = buildTsFixture(fixture, 'int-arith.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /__ps\.Int_add\(-2n\)\(5n\)/, 'Int.add must emit through the checked Int runtime helper');
assert.match(tsSource, /__ps\.Int_neg\(5n\)/, 'Int.neg must emit through the checked Int runtime helper');
assert.match(tsSource, /__ps\.Int_beq\(-3n\)\(__ps\.Int_neg\(3n\)\)/, 'Int.beq must emit through the checked Int runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.nestedInt, 3n);
assert.equal(compiled.sameInt, true);

const badNat = createPsliveFixture('proofscript-int-arith-bad-nat-', {
  fileName: 'BadNatIntAdd.ps',
  source: String.raw`
def bad: Nat := { Int.add(1, 2) }
`,
});
const rejectedNat = expectPsliveRejected(['check', badNat.source, '--json']);
assert.match(rejectedNat.message, /Int|Nat|wrong type|expected/i);

const badBoolPayload = createPsliveFixture('proofscript-int-arith-bad-bool-', {
  fileName: 'BadBoolIntAdd.ps',
  source: String.raw`
def bad: Int := { Int.add(Bool.true, 2) }
`,
});
const rejectedBool = expectPsliveRejected(['check', badBoolPayload.source, '--json']);
assert.match(rejectedBool.message, /Int|Bool|wrong type|expected/i);

console.log('PSLIVE_INT_ARITH=PASS');
