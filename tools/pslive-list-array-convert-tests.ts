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

const fixture = createPsliveFixture('proofscript-list-array-convert-', {
  fileName: 'ListArrayConvert.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 4, List.cons(Nat, 5, List.cons(Nat, 6, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }
def arr: Array(Nat) := { [4, 5, 6] }
def emptyArr: Array(Nat) := { [] }

def listToArray: Array(Nat) := { List.toArray(Nat, xs) }
def emptyListToArray: Array(Nat) := { List.toArray(Nat, emptyList) }
def arrayToList: List(Nat) := { Array.toList(Nat, arr) }
def emptyArrayToList: List(Nat) := { Array.toList(Nat, emptyArr) }

theorem list_to_array_rfl: listToArray = Array.mk(Nat, xs) := by rfl
theorem empty_list_to_array_rfl: emptyListToArray = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem array_to_list_rfl: arrayToList = xs := by rfl
theorem empty_array_to_list_rfl: emptyArrayToList = List.nil(Nat) := by rfl
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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-convert.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listToArray'), 'List.toArray result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayToList'), 'Array.toList result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listToArray.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.listToArray.fields[0]), [4n, 5n, 6n]);
assert.deepEqual(listToArray(jsModule.emptyListToArray.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayToList), [4n, 5n, 6n]);
assert.deepEqual(listToArray(jsModule.emptyArrayToList), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-convert.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_toArrayValue/, 'TypeScript emission should route List.toArray through the checked runtime helper');
assert.match(tsSource, /Array_toList/, 'TypeScript emission should route Array.toList through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listToArray.fields[0]), [4n, 5n, 6n]);
assert.deepEqual(listToArray(compiled.arrayToList), [4n, 5n, 6n]);

const badListArgument = createPsliveFixture('proofscript-list-to-array-bad-arg-', {
  fileName: 'BadListToArrayArg.ps',
  source: `
def bad: Array(Nat) := { List.toArray(Nat, [1, 2]) }
`,
});
const rejectedListArgument = expectPsliveRejected(['check', badListArgument.source, '--json']);
assert.match(rejectedListArgument.message, /type mismatch|expected|List|Array/i);

const badArrayArgument = createPsliveFixture('proofscript-array-to-list-bad-arg-', {
  fileName: 'BadArrayToListArg.ps',
  source: `
def bad: List(Nat) := { Array.toList(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayArgument = expectPsliveRejected(['check', badArrayArgument.source, '--json']);
assert.match(rejectedArrayArgument.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-to-array-bad-result-', {
  fileName: 'BadListToArrayResult.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: List(Nat) := { List.toArray(Nat, xs) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|List|Array/i);

console.log('PSLIVE_LIST_ARRAY_CONVERT=PASS');
