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

const fixture = createPsliveFixture('proofscript-list-array-find-', {
  fileName: 'ListArrayFind.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
function isTwo(x: Nat): Bool := { x == 2 }
function isNine(x: Nat): Bool := { x == 9 }

def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 0, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listFindTwo: Option(Nat) := { List.find?(Nat, isTwo, xs) }
def listFindNine: Option(Nat) := { List.find?(Nat, isNine, xs) }
def listFindEmpty: Option(Nat) := { List.find?(Nat, isZero, emptyList) }

def arr: Array(Nat) := { [1, 2, 0] }
def arrEmpty: Array(Nat) := { [] }

def arrayFindZero: Option(Nat) := { Array.find?(Nat, isZero, arr) }
def arrayFindNine: Option(Nat) := { Array.find?(Nat, isNine, arr) }
def arrayFindEmpty: Option(Nat) := { Array.find?(Nat, isZero, arrEmpty) }

theorem list_find_two_rfl: listFindTwo = Option.some(Nat, 2) := by rfl
theorem list_find_nine_rfl: listFindNine = Option.none(Nat) := by rfl
theorem list_find_empty_rfl: listFindEmpty = Option.none(Nat) := by rfl
theorem array_find_zero_rfl: arrayFindZero = Option.some(Nat, 0) := by rfl
theorem array_find_nine_rfl: arrayFindNine = Option.none(Nat) := by rfl
theorem array_find_empty_rfl: arrayFindEmpty = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-find.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listFindTwo'), 'List.find? result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayFindZero'), 'Array.find? result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listFindTwo.__psInductive, 'Option');
assert.equal(jsModule.listFindTwo.__psCtor, 1);
assert.deepEqual(jsModule.listFindTwo.fields, [2n]);
assert.equal(jsModule.listFindNine.__psCtor, 0);
assert.equal(jsModule.listFindEmpty.__psCtor, 0);
assert.equal(jsModule.arrayFindZero.__psInductive, 'Option');
assert.equal(jsModule.arrayFindZero.__psCtor, 1);
assert.deepEqual(jsModule.arrayFindZero.fields, [0n]);
assert.equal(jsModule.arrayFindNine.__psCtor, 0);
assert.equal(jsModule.arrayFindEmpty.__psCtor, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-find.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_findOpt/, 'TypeScript emission should route List.find? through the checked runtime helper');
assert.match(tsSource, /Array_findOpt/, 'TypeScript emission should route Array.find? through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.listFindTwo.__psCtor, 1);
assert.deepEqual(compiled.listFindTwo.fields, [2n]);
assert.equal(compiled.listFindNine.__psCtor, 0);
assert.equal(compiled.arrayFindZero.__psCtor, 1);
assert.deepEqual(compiled.arrayFindZero.fields, [0n]);
assert.equal(compiled.arrayFindEmpty.__psCtor, 0);

const badPredicate = createPsliveFixture('proofscript-list-find-bad-predicate-', {
  fileName: 'BadListFindPredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: Option(Nat) := { List.find?(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badListFind = createPsliveFixture('proofscript-list-find-bad-array-', {
  fileName: 'BadListFindArray.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Option(Nat) := { List.find?(Nat, isZero, [1, 2]) }
`,
});
const rejectedListFind = expectPsliveRejected(['check', badListFind.source, '--json']);
assert.match(rejectedListFind.message, /type mismatch|expected|List|Array/i);

const badArrayFind = createPsliveFixture('proofscript-array-find-bad-list-', {
  fileName: 'BadArrayFindList.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Option(Nat) := { Array.find?(Nat, isZero, List.nil(Nat)) }
`,
});
const rejectedArrayFind = expectPsliveRejected(['check', badArrayFind.source, '--json']);
assert.match(rejectedArrayFind.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-array-find-bad-result-', {
  fileName: 'BadArrayFindResult.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Nat := { Array.find?(Nat, isZero, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|Nat/i);

console.log('PSLIVE_LIST_ARRAY_FIND=PASS');
