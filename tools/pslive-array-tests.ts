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

const fixture = createPsliveFixture('proofscript-array-', {
  fileName: 'Array.ps',
  source: `
def emptyNatArray: Array(Nat) := { [] }
def oneTwoThreeArray: Array(Nat) := { [1, 2, 3] }
def nestedArray: Array(Nat) := { [1 + 1, 3 - 1, Nat.succ(2)] }

theorem empty_array_rfl: emptyNatArray = [] := by rfl
theorem one_two_three_array_rfl: oneTwoThreeArray = [1, 2, 3] := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'array.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'oneTwoThreeArray'), 'Array value must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.emptyNatArray.__psInductive, 'Array');
assert.equal(jsModule.emptyNatArray.__psCtor, 0);
assert.equal(jsModule.emptyNatArray.fields[0].__psInductive, 'List');
assert.equal(jsModule.oneTwoThreeArray.__psInductive, 'Array');
assert.equal(jsModule.oneTwoThreeArray.fields[0].__psInductive, 'List');
assert.equal(jsModule.oneTwoThreeArray.fields[0].fields[0], 1n);
assert.equal(jsModule.nestedArray.fields[0].fields[0], 2n);

const { outPath: tsOut } = buildTsFixture(fixture, 'array.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Struct_mk\("Array", 0, \[/, 'Array literal should lower to checked Array.mk constructor');
assert.match(tsSource, /Struct_mk\("List", 1, \[1n, /, 'Array literal should store checked List payload');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.oneTwoThreeArray.fields[0].fields[0], 1n);

const badNoExpected = createPsliveFixture('proofscript-array-bad-no-expected-', {
  fileName: 'BadArrayNoExpected.ps',
  source: `
theorem bad: [1, 2] = [1, 2] := by rfl
`,
});
const noExpected = expectPsliveRejected(['check', badNoExpected.source, '--json']);
assert.match(noExpected.message, /expected Array\(A\)|array literal/i);

const badPayload = createPsliveFixture('proofscript-array-bad-payload-', {
  fileName: 'BadArrayPayload.ps',
  source: `
def bad: Array(Nat) := { [1, true] }
`,
});
const wrongPayload = expectPsliveRejected(['check', badPayload.source, '--json']);
assert.match(wrongPayload.message, /expected type|Bool|Nat|argument/i);

const badType = createPsliveFixture('proofscript-array-bad-type-', {
  fileName: 'BadArrayType.ps',
  source: `
def bad: Nat := { [1, 2] }
`,
});
const wrongType = expectPsliveRejected(['check', badType.source, '--json']);
assert.match(wrongType.message, /expected Array\(A\)|array literal|Nat/i);

console.log('PSLIVE_ARRAY=PASS');
