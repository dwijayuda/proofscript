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

const fixture = createPsliveFixture('proofscript-list-array-any-all-', {
  fileName: 'ListArrayAnyAll.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
function isNonZero(x: Nat): Bool := { Bool.not(x == 0) }


def xs: List(Nat) := { List.cons(Nat, 0, List.cons(Nat, 2, List.cons(Nat, 0, List.nil(Nat)))) }
def noZero: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) }
def allZeros: List(Nat) := { List.cons(Nat, 0, List.cons(Nat, 0, List.nil(Nat))) }

def listAnyTrue: Bool := { List.any(Nat, isZero, xs) }
def listAnyFalse: Bool := { List.any(Nat, isZero, noZero) }
def listAnyEmpty: Bool := { List.any(Nat, isZero, List.nil(Nat)) }
def listAllTrue: Bool := { List.all(Nat, isZero, allZeros) }
def listAllFalse: Bool := { List.all(Nat, isZero, xs) }
def listAllEmpty: Bool := { List.all(Nat, isZero, List.nil(Nat)) }
def listAnyNonZero: Bool := { List.any(Nat, isNonZero, xs) }
def listAllNonZero: Bool := { List.all(Nat, isNonZero, noZero) }

def arr: Array(Nat) := { [0, 2, 0] }
def arrNoZero: Array(Nat) := { [1, 2] }
def arrAllZeros: Array(Nat) := { [0, 0] }

def arrayAnyTrue: Bool := { Array.any(Nat, isZero, arr) }
def arrayAnyFalse: Bool := { Array.any(Nat, isZero, arrNoZero) }
def arrayAnyEmpty: Bool := { Array.any(Nat, isZero, []) }
def arrayAllTrue: Bool := { Array.all(Nat, isZero, arrAllZeros) }
def arrayAllFalse: Bool := { Array.all(Nat, isZero, arr) }
def arrayAllEmpty: Bool := { Array.all(Nat, isZero, []) }

theorem list_any_true_rfl: listAnyTrue = true := by rfl
theorem list_any_false_rfl: listAnyFalse = false := by rfl
theorem list_any_empty_rfl: listAnyEmpty = false := by rfl
theorem list_all_true_rfl: listAllTrue = true := by rfl
theorem list_all_false_rfl: listAllFalse = false := by rfl
theorem list_all_empty_rfl: listAllEmpty = true := by rfl
theorem array_any_true_rfl: arrayAnyTrue = true := by rfl
theorem array_any_false_rfl: arrayAnyFalse = false := by rfl
theorem array_any_empty_rfl: arrayAnyEmpty = false := by rfl
theorem array_all_true_rfl: arrayAllTrue = true := by rfl
theorem array_all_false_rfl: arrayAllFalse = false := by rfl
theorem array_all_empty_rfl: arrayAllEmpty = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-any-all.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listAnyTrue'), 'List.any result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'listAllTrue'), 'List.all result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayAnyTrue'), 'Array.any result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayAllTrue'), 'Array.all result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listAnyTrue, true);
assert.equal(jsModule.listAnyFalse, false);
assert.equal(jsModule.listAnyEmpty, false);
assert.equal(jsModule.listAllTrue, true);
assert.equal(jsModule.listAllFalse, false);
assert.equal(jsModule.listAllEmpty, true);
assert.equal(jsModule.listAnyNonZero, true);
assert.equal(jsModule.listAllNonZero, true);
assert.equal(jsModule.arrayAnyTrue, true);
assert.equal(jsModule.arrayAnyFalse, false);
assert.equal(jsModule.arrayAnyEmpty, false);
assert.equal(jsModule.arrayAllTrue, true);
assert.equal(jsModule.arrayAllFalse, false);
assert.equal(jsModule.arrayAllEmpty, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-any-all.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_any/, 'TypeScript emission should route List.any through the checked runtime helper');
assert.match(tsSource, /List_all/, 'TypeScript emission should route List.all through the checked runtime helper');
assert.match(tsSource, /Array_any/, 'TypeScript emission should route Array.any through the checked runtime helper');
assert.match(tsSource, /Array_all/, 'TypeScript emission should route Array.all through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.listAnyTrue, true);
assert.equal(compiled.listAllEmpty, true);
assert.equal(compiled.arrayAnyFalse, false);
assert.equal(compiled.arrayAllEmpty, true);

const badPredicate = createPsliveFixture('proofscript-list-any-bad-predicate-', {
  fileName: 'BadListAnyPredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: Bool := { List.any(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badListAny = createPsliveFixture('proofscript-list-any-bad-array-', {
  fileName: 'BadListAnyArray.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Bool := { List.any(Nat, isZero, [1, 2]) }
`,
});
const rejectedListAny = expectPsliveRejected(['check', badListAny.source, '--json']);
assert.match(rejectedListAny.message, /type mismatch|expected|List|Array/i);

const badArrayAll = createPsliveFixture('proofscript-array-all-bad-list-', {
  fileName: 'BadArrayAllList.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Bool := { Array.all(Nat, isZero, List.nil(Nat)) }
`,
});
const rejectedArrayAll = expectPsliveRejected(['check', badArrayAll.source, '--json']);
assert.match(rejectedArrayAll.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-array-any-bad-result-', {
  fileName: 'BadArrayAnyResult.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Nat := { Array.any(Nat, isZero, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Bool|Nat/i);

console.log('PSLIVE_LIST_ARRAY_ANY_ALL=PASS');
