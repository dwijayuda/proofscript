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

const fixture = createPsliveFixture('proofscript-int-', {
  fileName: 'Int.ps',
  source: String.raw`
def zeroInt: Int := { 0 }
def posSeven: Int := { 7 }
def negThree: Int := { -3 }
def idInt(x: Int): Int := { x }
def negAgain: Int := { idInt(-3) }

theorem zero_int_rfl: zeroInt = 0 := by rfl
theorem neg_three_rfl: negThree = -3 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'int.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'negThree'), 'Int literal definitions must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.zeroInt, 0n);
assert.equal(jsModule.posSeven, 7n);
assert.equal(jsModule.negThree, -3n);
assert.equal(jsModule.negAgain, -3n);

const { outPath: tsOut } = buildTsFixture(fixture, 'int.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /export const zeroInt: PsValue = 0n;/, 'zero Int literal must emit as BigInt zero');
assert.match(tsSource, /export const negThree: PsValue = -3n;/, 'negative Int literal must emit as signed BigInt');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.posSeven, 7n);
assert.equal(compiled.negAgain, -3n);

const badNatNegative = createPsliveFixture('proofscript-int-bad-nat-negative-', {
  fileName: 'BadNatNegative.ps',
  source: String.raw`
def bad: Nat := { -1 }
`,
});
const rejectedNatNegative = expectPsliveRejected(['check', badNatNegative.source, '--json']);
assert.match(rejectedNatNegative.message, /Int|Nat|expected type|negative/i);

const badStringToInt = createPsliveFixture('proofscript-int-bad-string-', {
  fileName: 'BadStringToInt.ps',
  source: String.raw`
def bad: Int := { "not an int" }
`,
});
const rejectedString = expectPsliveRejected(['check', badStringToInt.source, '--json']);
assert.match(rejectedString.message, /String|Int|literal|expected type/i);

console.log('PSLIVE_INT=PASS');
