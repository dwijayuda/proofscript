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

const fixture = createPsliveFixture('proofscript-list-array-take-', {
  fileName: 'ListArrayTake.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listTakeZero: List(Nat) := { List.take(Nat, xs, 0) }
def listTakeTwo: List(Nat) := { List.take(Nat, xs, 2) }
def listTakeTooMany: List(Nat) := { List.take(Nat, xs, 9) }
def listTakeEmpty: List(Nat) := { List.take(Nat, emptyList, 2) }

def arr: Array(Nat) := { [7, 2, 9] }
def arrEmpty: Array(Nat) := { [] }

def arrayTakeZero: Array(Nat) := { Array.take(Nat, arr, 0) }
def arrayTakeTwo: Array(Nat) := { Array.take(Nat, arr, 2) }
def arrayTakeTooMany: Array(Nat) := { Array.take(Nat, arr, 9) }
def arrayTakeEmpty: Array(Nat) := { Array.take(Nat, arrEmpty, 2) }

theorem list_take_zero_rfl: listTakeZero = List.nil(Nat) := by rfl
theorem list_take_two_rfl: listTakeTwo = List.cons(Nat, 7, List.cons(Nat, 2, List.nil(Nat))) := by rfl
theorem list_take_too_many_rfl: listTakeTooMany = xs := by rfl
theorem list_take_empty_rfl: listTakeEmpty = List.nil(Nat) := by rfl
theorem array_take_zero_rfl: arrayTakeZero = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem array_take_two_rfl: arrayTakeTwo = Array.mk(Nat, List.cons(Nat, 7, List.cons(Nat, 2, List.nil(Nat)))) := by rfl
theorem array_take_too_many_rfl: arrayTakeTooMany = arr := by rfl
theorem array_take_empty_rfl: arrayTakeEmpty = Array.mk(Nat, List.nil(Nat)) := by rfl
`,
});

function listToArray(list: any): bigint[] {
  const out: bigint[] = [];
  let cursor = list;
  for (let depth = 0; depth < 16; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    assert.equal(cursor.fields.length, 2);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('test List payload exceeded finite depth');
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-take.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listTakeTwo'), 'List.take result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayTakeTwo'), 'Array.take result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.listTakeZero), []);
assert.deepEqual(listToArray(jsModule.listTakeTwo), [7n, 2n]);
assert.deepEqual(listToArray(jsModule.listTakeTooMany), [7n, 2n, 9n]);
assert.deepEqual(listToArray(jsModule.listTakeEmpty), []);
assert.equal(jsModule.arrayTakeZero.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.arrayTakeZero.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayTakeTwo.fields[0]), [7n, 2n]);
assert.deepEqual(listToArray(jsModule.arrayTakeTooMany.fields[0]), [7n, 2n, 9n]);
assert.deepEqual(listToArray(jsModule.arrayTakeEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-take.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_take/, 'TypeScript emission should route List.take through the checked runtime helper');
assert.match(tsSource, /Array_take/, 'TypeScript emission should route Array.take through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listTakeTwo), [7n, 2n]);
assert.deepEqual(listToArray(compiled.arrayTakeTwo.fields[0]), [7n, 2n]);

const badIndexType = createPsliveFixture('proofscript-list-take-bad-index-', {
  fileName: 'BadListTakeIndex.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: List(Nat) := { List.take(Nat, xs, "0") }
`,
});
const rejectedIndex = expectPsliveRejected(['check', badIndexType.source, '--json']);
assert.match(rejectedIndex.message, /type mismatch|expected Nat|String/i);

const badListType = createPsliveFixture('proofscript-list-take-bad-array-', {
  fileName: 'BadListTakeArray.ps',
  source: `
def bad: List(Nat) := { List.take(Nat, [1, 2], 1) }
`,
});
const rejectedList = expectPsliveRejected(['check', badListType.source, '--json']);
assert.match(rejectedList.message, /type mismatch|expected|List|Array/i);

const badArrayType = createPsliveFixture('proofscript-array-take-bad-list-', {
  fileName: 'BadArrayTakeList.ps',
  source: `
def bad: Array(Nat) := { Array.take(Nat, List.nil(Nat), 1) }
`,
});
const rejectedArray = expectPsliveRejected(['check', badArrayType.source, '--json']);
assert.match(rejectedArray.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-take-bad-result-', {
  fileName: 'BadListTakeResult.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Option(Nat) := { List.take(Nat, xs, 1) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|List/i);

console.log('PSLIVE_LIST_ARRAY_TAKE=PASS');
