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

const fixture = createPsliveFixture('proofscript-list-array-takewhile-', {
  fileName: 'ListArrayTakeWhile.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
function idNat(x: Nat): Nat := { x }

def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 5, List.cons(Nat, 3, List.nil(Nat))))) }
def allSmall: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def noneSmall: List(Nat) := { List.cons(Nat, 5, List.cons(Nat, 1, List.nil(Nat))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listPrefix: List(Nat) := { List.takeWhile(Nat, ltFour, xs) }
def listAll: List(Nat) := { List.takeWhile(Nat, ltFour, allSmall) }
def listNone: List(Nat) := { List.takeWhile(Nat, ltFour, noneSmall) }
def listEmpty: List(Nat) := { List.takeWhile(Nat, ltFour, emptyList) }

def arr: Array(Nat) := { [1, 2, 5, 3] }
def arrAllSmall: Array(Nat) := { [1, 2, 3] }
def arrNoneSmall: Array(Nat) := { [5, 1] }
def arrEmpty: Array(Nat) := { [] }

def arrayPrefix: Array(Nat) := { Array.takeWhile(Nat, ltFour, arr) }
def arrayAll: Array(Nat) := { Array.takeWhile(Nat, ltFour, arrAllSmall) }
def arrayNone: Array(Nat) := { Array.takeWhile(Nat, ltFour, arrNoneSmall) }
def arrayEmpty: Array(Nat) := { Array.takeWhile(Nat, ltFour, arrEmpty) }

theorem list_prefix_rfl: listPrefix = List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) := by rfl
theorem list_all_rfl: listAll = allSmall := by rfl
theorem list_none_rfl: listNone = List.nil(Nat) := by rfl
theorem list_empty_rfl: listEmpty = List.nil(Nat) := by rfl
theorem array_prefix_rfl: arrayPrefix = [1, 2] := by rfl
theorem array_all_rfl: arrayAll = arrAllSmall := by rfl
theorem array_none_rfl: arrayNone = [] := by rfl
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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-takewhile.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listPrefix'), 'List.takeWhile result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayPrefix'), 'Array.takeWhile result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.listPrefix), [1n, 2n]);
assert.deepEqual(listToArray(jsModule.listAll), [1n, 2n, 3n]);
assert.deepEqual(listToArray(jsModule.listNone), []);
assert.deepEqual(listToArray(jsModule.listEmpty), []);
assert.deepEqual(listToArray(jsModule.arrayPrefix.fields[0]), [1n, 2n]);
assert.deepEqual(listToArray(jsModule.arrayAll.fields[0]), [1n, 2n, 3n]);
assert.deepEqual(listToArray(jsModule.arrayNone.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrayEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-takewhile.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_takeWhile/, 'TypeScript emission should route List.takeWhile through the checked runtime helper');
assert.match(tsSource, /Array_takeWhile/, 'TypeScript emission should route Array.takeWhile through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.listPrefix), [1n, 2n]);
assert.deepEqual(listToArray(compiled.arrayPrefix.fields[0]), [1n, 2n]);

const badPredicate = createPsliveFixture('proofscript-list-takewhile-bad-predicate-', {
  fileName: 'BadListTakeWhilePredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: List(Nat) := { List.takeWhile(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badListArgument = createPsliveFixture('proofscript-list-takewhile-bad-array-', {
  fileName: 'BadListTakeWhileArray.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: List(Nat) := { List.takeWhile(Nat, ltFour, [1, 2]) }
`,
});
const rejectedListArgument = expectPsliveRejected(['check', badListArgument.source, '--json']);
assert.match(rejectedListArgument.message, /type mismatch|expected|List|Array/i);

const badArrayArgument = createPsliveFixture('proofscript-array-takewhile-bad-list-', {
  fileName: 'BadArrayTakeWhileList.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: Array(Nat) := { Array.takeWhile(Nat, ltFour, List.nil(Nat)) }
`,
});
const rejectedArrayArgument = expectPsliveRejected(['check', badArrayArgument.source, '--json']);
assert.match(rejectedArrayArgument.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-takewhile-bad-result-', {
  fileName: 'BadListTakeWhileResult.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Bool := { List.takeWhile(Nat, ltFour, xs) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Bool|List/i);

console.log('PSLIVE_LIST_ARRAY_TAKEWHILE=PASS');
