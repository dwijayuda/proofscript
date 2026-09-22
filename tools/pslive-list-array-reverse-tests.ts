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

const fixture = createPsliveFixture('proofscript-list-array-reverse-', {
  fileName: 'ListArrayReverse.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def reversedList: List(Nat) := { List.reverse(Nat, xs) }
def reverseEmptyList: List(Nat) := { List.reverse(Nat, List.nil(Nat)) }

def arr: Array(Nat) := { [1, 2, 3] }
def reversedArray: Array(Nat) := { Array.reverse(Nat, arr) }
def reverseEmptyArray: Array(Nat) := { Array.reverse(Nat, []) }

theorem reversed_list_rfl:
  reversedList = List.cons(Nat, 3, List.cons(Nat, 2, List.cons(Nat, 1, List.nil(Nat)))) := by rfl
theorem reverse_empty_list_rfl: reverseEmptyList = List.nil(Nat) := by rfl
theorem reversed_array_rfl: reversedArray = [3, 2, 1] := by rfl
theorem reverse_empty_array_rfl: reverseEmptyArray = [] := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-reverse.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'reversedList'), 'List.reverse result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'reversedArray'), 'Array.reverse result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.reversedList), [3n, 2n, 1n]);
assert.deepEqual(listToArray(jsModule.reverseEmptyList), []);
assert.deepEqual(listToArray(jsModule.reversedArray.fields[0]), [3n, 2n, 1n]);
assert.deepEqual(listToArray(jsModule.reverseEmptyArray.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-reverse.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_reverse/, 'TypeScript emission should route List.reverse through the checked runtime helper');
assert.match(tsSource, /Array_reverse/, 'TypeScript emission should route Array.reverse through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.reversedList), [3n, 2n, 1n]);
assert.deepEqual(listToArray(compiled.reversedArray.fields[0]), [3n, 2n, 1n]);

const badListReverse = createPsliveFixture('proofscript-list-reverse-bad-array-', {
  fileName: 'BadListReverseArray.ps',
  source: `
def bad: List(Nat) := { List.reverse(Nat, [1, 2]) }
`,
});
const rejectedListReverse = expectPsliveRejected(['check', badListReverse.source, '--json']);
assert.match(rejectedListReverse.message, /type mismatch|expected|List|Array/i);

const badArrayReverse = createPsliveFixture('proofscript-array-reverse-bad-list-', {
  fileName: 'BadArrayReverseList.ps',
  source: `
def bad: Array(Nat) := { Array.reverse(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayReverse = expectPsliveRejected(['check', badArrayReverse.source, '--json']);
assert.match(rejectedArrayReverse.message, /type mismatch|expected|Array|List/i);

console.log('PSLIVE_LIST_ARRAY_REVERSE=PASS');
