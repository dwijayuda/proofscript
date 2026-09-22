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

function listToArray(list) {
  const out = [];
  let cursor = list;
  for (let depth = 0; depth < 100000; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('bounded list traversal exceeded');
}

const fixture = createPsliveFixture('proofscript-list-array-append-', {
  fileName: 'ListArrayAppend.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) }
def ys: List(Nat) := { List.cons(Nat, 3, List.cons(Nat, 4, List.nil(Nat))) }
def appendedList: List(Nat) := { List.append(Nat, xs, ys) }
def appendLeftEmpty: List(Nat) := { List.append(Nat, List.nil(Nat), ys) }
def appendRightEmpty: List(Nat) := { List.append(Nat, xs, List.nil(Nat)) }

def arrA: Array(Nat) := { [1, 2] }
def arrB: Array(Nat) := { [3, 4] }
def appendedArray: Array(Nat) := { Array.append(Nat, arrA, arrB) }
def appendArrayLeftEmpty: Array(Nat) := { Array.append(Nat, [], arrB) }
def appendArrayRightEmpty: Array(Nat) := { Array.append(Nat, arrA, []) }

theorem appended_list_rfl: appendedList = List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.cons(Nat, 4, List.nil(Nat))))) := by rfl
theorem append_left_empty_rfl: appendLeftEmpty = ys := by rfl
theorem append_right_empty_rfl: appendRightEmpty = xs := by rfl
theorem appended_array_rfl: appendedArray = [1, 2, 3, 4] := by rfl
theorem append_array_left_empty_rfl: appendArrayLeftEmpty = [3, 4] := by rfl
theorem append_array_right_empty_rfl: appendArrayRightEmpty = [1, 2] := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-append.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'appendedList'), 'List.append result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'appendedArray'), 'Array.append result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.appendedList), [1n, 2n, 3n, 4n]);
assert.deepEqual(listToArray(jsModule.appendLeftEmpty), [3n, 4n]);
assert.deepEqual(listToArray(jsModule.appendRightEmpty), [1n, 2n]);
assert.deepEqual(listToArray(jsModule.appendedArray.fields[0]), [1n, 2n, 3n, 4n]);
assert.deepEqual(listToArray(jsModule.appendArrayLeftEmpty.fields[0]), [3n, 4n]);
assert.deepEqual(listToArray(jsModule.appendArrayRightEmpty.fields[0]), [1n, 2n]);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-append.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_append/, 'TypeScript emission should route List.append through the checked runtime helper');
assert.match(tsSource, /Array_append/, 'TypeScript emission should route Array.append through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.appendedList), [1n, 2n, 3n, 4n]);
assert.deepEqual(listToArray(compiled.appendedArray.fields[0]), [1n, 2n, 3n, 4n]);

const badListElement = createPsliveFixture('proofscript-list-append-bad-element-', {
  fileName: 'BadListAppendElement.ps',
  source: `
def bad: List(Nat) := { List.append(Nat, List.cons(Nat, 1, List.nil(Nat)), List.cons(Bool, true, List.nil(Bool))) }
`,
});
const rejectedListElement = expectPsliveRejected(['check', badListElement.source, '--json']);
assert.match(rejectedListElement.message, /type mismatch|expected|Bool|Nat|List/i);

const badArrayResult = createPsliveFixture('proofscript-array-append-bad-result-', {
  fileName: 'BadArrayAppendResult.ps',
  source: `
def bad: Array(Bool) := { Array.append(Nat, [1], [2]) }
`,
});
const rejectedArrayResult = expectPsliveRejected(['check', badArrayResult.source, '--json']);
assert.match(rejectedArrayResult.message, /type mismatch|expected|Array|Bool|Nat/i);

console.log('PSLIVE_LIST_ARRAY_APPEND=PASS');
