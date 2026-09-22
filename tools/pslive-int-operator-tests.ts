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

const fixture = createPsliveFixture('proofscript-int-operators-', {
  fileName: 'IntOperators.ps',
  source: String.raw`
def intPlusOp: Int := { -2 + 5 }
def intSubOp: Int := { 3 - 5 }
def intNestedOp: Int := { 10 + -4 - 3 }
def intEqTrue: Bool := { -3 == Int.neg(3) }
def intEqFalse: Bool := { -3 == 3 }

def idInt(x: Int): Int := { x }
def intViaFunction: Int := { idInt(2) + -5 }

def natStillWorks: Nat := { 10 - 3 + 1 }
def natEqStillWorks: Bool := { 3 == 3 }

theorem int_plus_op_rfl: intPlusOp = 3 := by rfl
theorem int_sub_op_rfl: intSubOp = -2 := by rfl
theorem int_nested_op_rfl: intNestedOp = 3 := by rfl
theorem int_eq_true_rfl: intEqTrue = Bool.true := by rfl
theorem int_eq_false_rfl: intEqFalse = Bool.false := by rfl
theorem int_via_function_rfl: intViaFunction = -3 := by rfl
theorem nat_still_rfl: natStillWorks = 8 := by rfl
theorem nat_eq_still_rfl: natEqStillWorks = Bool.true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'int-operators.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'intNestedOp'), 'Int operator declarations must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.intPlusOp, 3n);
assert.equal(jsModule.intSubOp, -2n);
assert.equal(jsModule.intNestedOp, 3n);
assert.equal(jsModule.intEqTrue, true);
assert.equal(jsModule.intEqFalse, false);
assert.equal(jsModule.intViaFunction, -3n);
assert.equal(jsModule.natStillWorks, 8n);
assert.equal(jsModule.natEqStillWorks, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'int-operators.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /__ps\.Int_add\(-2n\)\(5n\)/, 'Int + must lower to checked Int.add runtime helper');
assert.match(tsSource, /__ps\.Int_sub\(__ps\.Int_add\(10n\)\(-4n\)\)\(3n\)/, 'Int - must lower to checked Int.sub runtime helper');
assert.match(tsSource, /__ps\.Nat_sub\(10n\)\(3n\)/, 'Nat - must continue to lower to checked Nat.sub runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.intPlusOp, 3n);
assert.equal(compiled.intViaFunction, -3n);
assert.equal(compiled.natStillWorks, 8n);

const badNat = createPsliveFixture('proofscript-int-operators-bad-nat-', {
  fileName: 'BadNatIntOperator.ps',
  source: String.raw`
def bad: Nat := { -2 + 5 }
`,
});
const rejectedNat = expectPsliveRejected(['check', badNat.source, '--json']);
assert.match(rejectedNat.message, /Int|Nat|wrong type|expected|literal/i);

const badBool = createPsliveFixture('proofscript-int-operators-bad-bool-', {
  fileName: 'BadBoolIntOperator.ps',
  source: String.raw`
def bad: Int := { Bool.true + 1 }
`,
});
const rejectedBool = expectPsliveRejected(['check', badBool.source, '--json']);
assert.match(rejectedBool.message, /Int|Bool|Nat|wrong type|expected/i);

console.log('PSLIVE_INT_OPERATORS=PASS');
