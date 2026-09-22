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

const fixture = createPsliveFixture('proofscript-list-array-range-', {
  fileName: 'ListArrayRange.ps',
  source: `
def listRangeZero: List(Nat) := { List.range(0) }
def listRangeThree: List(Nat) := { List.range(3) }

def arrayRangeZero: Array(Nat) := { Array.range(0) }
def arrayRangeThree: Array(Nat) := { Array.range(3) }

theorem list_range_zero_rfl: listRangeZero = List.nil(Nat) := by rfl
theorem list_range_three_rfl: listRangeThree = List.cons(Nat, 0, List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat)))) := by rfl
theorem array_range_zero_rfl: arrayRangeZero = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem array_range_three_rfl: arrayRangeThree = Array.mk(Nat, List.cons(Nat, 0, List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))))) := by rfl
`,
});

function listToArray(list: any): bigint[] {
  const out: bigint[] = [];
  let cursor = list;
  for (let depth = 0; depth < 32; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    assert.equal(cursor.fields.length, 2);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('test List payload exceeded finite depth');
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-range.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listRangeThree'), 'List.range result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayRangeThree'), 'Array.range result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.listRangeZero), []);
assert.deepEqual(listToArray(jsModule.listRangeThree), [0n, 1n, 2n]);
assert.equal(jsModule.arrayRangeZero.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.arrayRangeZero.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayRangeThree.fields[0]), [0n, 1n, 2n]);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-range.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_range/, 'TypeScript emission should route List.range through the checked runtime helper');
assert.match(tsSource, /Array_range/, 'TypeScript emission should route Array.range through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listRangeThree), [0n, 1n, 2n]);
assert.deepEqual(listToArray(compiled.arrayRangeThree.fields[0]), [0n, 1n, 2n]);

const badCount = createPsliveFixture('proofscript-list-range-bad-count-', {
  fileName: 'BadListRangeCount.ps',
  source: `
def bad: List(Nat) := { List.range("3") }
`,
});
const rejectedCount = expectPsliveRejected(['check', badCount.source, '--json']);
assert.match(rejectedCount.message, /type mismatch|expected Nat|String/i);

const badResult = createPsliveFixture('proofscript-array-range-bad-result-', {
  fileName: 'BadArrayRangeResult.ps',
  source: `
def bad: List(Nat) := { Array.range(3) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Array|List/i);

console.log('PSLIVE_LIST_ARRAY_RANGE=PASS');
