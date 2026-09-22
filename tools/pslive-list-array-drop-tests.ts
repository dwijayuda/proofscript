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

const fixture = createPsliveFixture('proofscript-list-array-drop-', {
  fileName: 'ListArrayDrop.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listDropZero: List(Nat) := { List.drop(Nat, xs, 0) }
def listDropTwo: List(Nat) := { List.drop(Nat, xs, 2) }
def listDropTooMany: List(Nat) := { List.drop(Nat, xs, 9) }
def listDropEmpty: List(Nat) := { List.drop(Nat, emptyList, 2) }

def arr: Array(Nat) := { [7, 2, 9] }
def arrEmpty: Array(Nat) := { [] }

def arrayDropZero: Array(Nat) := { Array.drop(Nat, arr, 0) }
def arrayDropTwo: Array(Nat) := { Array.drop(Nat, arr, 2) }
def arrayDropTooMany: Array(Nat) := { Array.drop(Nat, arr, 9) }
def arrayDropEmpty: Array(Nat) := { Array.drop(Nat, arrEmpty, 2) }

theorem list_drop_zero_rfl: listDropZero = xs := by rfl
theorem list_drop_two_rfl: listDropTwo = List.cons(Nat, 9, List.nil(Nat)) := by rfl
theorem list_drop_too_many_rfl: listDropTooMany = List.nil(Nat) := by rfl
theorem list_drop_empty_rfl: listDropEmpty = List.nil(Nat) := by rfl
theorem array_drop_zero_rfl: arrayDropZero = arr := by rfl
theorem array_drop_two_rfl: arrayDropTwo = Array.mk(Nat, List.cons(Nat, 9, List.nil(Nat))) := by rfl
theorem array_drop_too_many_rfl: arrayDropTooMany = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem array_drop_empty_rfl: arrayDropEmpty = Array.mk(Nat, List.nil(Nat)) := by rfl
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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-drop.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listDropTwo'), 'List.drop result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayDropTwo'), 'Array.drop result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.listDropZero), [7n, 2n, 9n]);
assert.deepEqual(listToArray(jsModule.listDropTwo), [9n]);
assert.deepEqual(listToArray(jsModule.listDropTooMany), []);
assert.deepEqual(listToArray(jsModule.listDropEmpty), []);
assert.equal(jsModule.arrayDropZero.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.arrayDropZero.fields[0]), [7n, 2n, 9n]);
assert.deepEqual(listToArray(jsModule.arrayDropTwo.fields[0]), [9n]);
assert.deepEqual(listToArray(jsModule.arrayDropTooMany.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayDropEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-drop.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_drop/, 'TypeScript emission should route List.drop through the checked runtime helper');
assert.match(tsSource, /Array_drop/, 'TypeScript emission should route Array.drop through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listDropTwo), [9n]);
assert.deepEqual(listToArray(compiled.arrayDropTwo.fields[0]), [9n]);

const badIndexType = createPsliveFixture('proofscript-list-drop-bad-index-', {
  fileName: 'BadListDropIndex.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: List(Nat) := { List.drop(Nat, xs, "0") }
`,
});
const rejectedIndex = expectPsliveRejected(['check', badIndexType.source, '--json']);
assert.match(rejectedIndex.message, /type mismatch|expected Nat|String/i);

const badListType = createPsliveFixture('proofscript-list-drop-bad-array-', {
  fileName: 'BadListDropArray.ps',
  source: `
def bad: List(Nat) := { List.drop(Nat, [1, 2], 1) }
`,
});
const rejectedList = expectPsliveRejected(['check', badListType.source, '--json']);
assert.match(rejectedList.message, /type mismatch|expected|List|Array/i);

const badArrayType = createPsliveFixture('proofscript-array-drop-bad-list-', {
  fileName: 'BadArrayDropList.ps',
  source: `
def bad: Array(Nat) := { Array.drop(Nat, List.nil(Nat), 1) }
`,
});
const rejectedArray = expectPsliveRejected(['check', badArrayType.source, '--json']);
assert.match(rejectedArray.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-drop-bad-result-', {
  fileName: 'BadListDropResult.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Option(Nat) := { List.drop(Nat, xs, 1) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|List/i);

console.log('PSLIVE_LIST_ARRAY_DROP=PASS');
