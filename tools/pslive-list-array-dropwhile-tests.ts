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

const fixture = createPsliveFixture('proofscript-list-array-dropwhile-', {
  fileName: 'ListArrayDropWhile.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
function idNat(x: Nat): Nat := { x }

def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 5, List.cons(Nat, 3, List.nil(Nat))))) }
def allSmall: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def noneSmall: List(Nat) := { List.cons(Nat, 5, List.cons(Nat, 1, List.nil(Nat))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listSuffix: List(Nat) := { List.dropWhile(Nat, ltFour, xs) }
def listAll: List(Nat) := { List.dropWhile(Nat, ltFour, allSmall) }
def listNone: List(Nat) := { List.dropWhile(Nat, ltFour, noneSmall) }
def listEmpty: List(Nat) := { List.dropWhile(Nat, ltFour, emptyList) }

def arr: Array(Nat) := { [1, 2, 5, 3] }
def arrAllSmall: Array(Nat) := { [1, 2, 3] }
def arrNoneSmall: Array(Nat) := { [5, 1] }
def arrEmpty: Array(Nat) := { [] }

def arraySuffix: Array(Nat) := { Array.dropWhile(Nat, ltFour, arr) }
def arrayAll: Array(Nat) := { Array.dropWhile(Nat, ltFour, arrAllSmall) }
def arrayNone: Array(Nat) := { Array.dropWhile(Nat, ltFour, arrNoneSmall) }
def arrayEmpty: Array(Nat) := { Array.dropWhile(Nat, ltFour, arrEmpty) }

theorem list_suffix_rfl: listSuffix = List.cons(Nat, 5, List.cons(Nat, 3, List.nil(Nat))) := by rfl
theorem list_all_rfl: listAll = List.nil(Nat) := by rfl
theorem list_none_rfl: listNone = noneSmall := by rfl
theorem list_empty_rfl: listEmpty = List.nil(Nat) := by rfl
theorem array_suffix_rfl: arraySuffix = [5, 3] := by rfl
theorem array_all_rfl: arrayAll = [] := by rfl
theorem array_none_rfl: arrayNone = arrNoneSmall := by rfl
theorem array_empty_rfl: arrayEmpty = [] := by rfl
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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-dropwhile.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listSuffix'), 'List.dropWhile result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arraySuffix'), 'Array.dropWhile result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.listSuffix), [5n, 3n]);
assert.deepEqual(listToArray(jsModule.listAll), []);
assert.deepEqual(listToArray(jsModule.listNone), [5n, 1n]);
assert.deepEqual(listToArray(jsModule.listEmpty), []);
assert.deepEqual(listToArray(jsModule.arraySuffix.fields[0]), [5n, 3n]);
assert.deepEqual(listToArray(jsModule.arrayAll.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayNone.fields[0]), [5n, 1n]);
assert.deepEqual(listToArray(jsModule.arrayEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-dropwhile.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_dropWhile/, 'TypeScript emission should route List.dropWhile through the checked runtime helper');
assert.match(tsSource, /Array_dropWhile/, 'TypeScript emission should route Array.dropWhile through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listSuffix), [5n, 3n]);
assert.deepEqual(listToArray(compiled.arraySuffix.fields[0]), [5n, 3n]);

const badPredicate = createPsliveFixture('proofscript-list-dropwhile-bad-predicate-', {
  fileName: 'BadListDropWhilePredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: List(Nat) := { List.dropWhile(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badListArgument = createPsliveFixture('proofscript-list-dropwhile-bad-array-', {
  fileName: 'BadListDropWhileArray.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: List(Nat) := { List.dropWhile(Nat, ltFour, [1, 2]) }
`,
});
const rejectedListArgument = expectPsliveRejected(['check', badListArgument.source, '--json']);
assert.match(rejectedListArgument.message, /type mismatch|expected|List|Array/i);

const badArrayArgument = createPsliveFixture('proofscript-array-dropwhile-bad-list-', {
  fileName: 'BadArrayDropWhileList.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: Array(Nat) := { Array.dropWhile(Nat, ltFour, List.nil(Nat)) }
`,
});
const rejectedArrayArgument = expectPsliveRejected(['check', badArrayArgument.source, '--json']);
assert.match(rejectedArrayArgument.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-dropwhile-bad-result-', {
  fileName: 'BadListDropWhileResult.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Bool := { List.dropWhile(Nat, ltFour, xs) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Bool|List/i);

console.log('PSLIVE_LIST_ARRAY_DROPWHILE=PASS');
