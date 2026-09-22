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

const fixture = createPsliveFixture('proofscript-list-array-countp-', {
  fileName: 'ListArrayCountP.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
function idNat(x: Nat): Nat := { x }

def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 5, List.cons(Nat, 2, List.cons(Nat, 7, List.nil(Nat))))) }
def allSmall: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def noneSmall: List(Nat) := { List.cons(Nat, 5, List.cons(Nat, 7, List.nil(Nat))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listCount: Nat := { List.countP(Nat, ltFour, xs) }
def listAllCount: Nat := { List.countP(Nat, ltFour, allSmall) }
def listNoneCount: Nat := { List.countP(Nat, ltFour, noneSmall) }
def listEmptyCount: Nat := { List.countP(Nat, ltFour, emptyList) }

def arr: Array(Nat) := { [1, 5, 2, 7] }
def arrAllSmall: Array(Nat) := { [1, 2, 3] }
def arrNoneSmall: Array(Nat) := { [5, 7] }
def arrEmpty: Array(Nat) := { [] }

def arrayCount: Nat := { Array.countP(Nat, ltFour, arr) }
def arrayAllCount: Nat := { Array.countP(Nat, ltFour, arrAllSmall) }
def arrayNoneCount: Nat := { Array.countP(Nat, ltFour, arrNoneSmall) }
def arrayEmptyCount: Nat := { Array.countP(Nat, ltFour, arrEmpty) }

theorem list_count_rfl: listCount = 2 := by rfl
theorem list_all_count_rfl: listAllCount = 3 := by rfl
theorem list_none_count_rfl: listNoneCount = 0 := by rfl
theorem list_empty_count_rfl: listEmptyCount = 0 := by rfl
theorem array_count_rfl: arrayCount = 2 := by rfl
theorem array_all_count_rfl: arrayAllCount = 3 := by rfl
theorem array_none_count_rfl: arrayNoneCount = 0 := by rfl
theorem array_empty_count_rfl: arrayEmptyCount = 0 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-countp.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listCount'), 'List.countP result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayCount'), 'Array.countP result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listCount, 2n);
assert.equal(jsModule.listAllCount, 3n);
assert.equal(jsModule.listNoneCount, 0n);
assert.equal(jsModule.listEmptyCount, 0n);
assert.equal(jsModule.arrayCount, 2n);
assert.equal(jsModule.arrayAllCount, 3n);
assert.equal(jsModule.arrayNoneCount, 0n);
assert.equal(jsModule.arrayEmptyCount, 0n);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-countp.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_countP/, 'TypeScript emission should route List.countP through the checked runtime helper');
assert.match(tsSource, /Array_countP/, 'TypeScript emission should route Array.countP through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.listCount, 2n);
assert.equal(compiled.arrayCount, 2n);

const badPredicate = createPsliveFixture('proofscript-list-countp-bad-predicate-', {
  fileName: 'BadListCountPPredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: Nat := { List.countP(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badListArgument = createPsliveFixture('proofscript-list-countp-bad-array-', {
  fileName: 'BadListCountPArray.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: Nat := { List.countP(Nat, ltFour, [1, 2]) }
`,
});
const rejectedListArgument = expectPsliveRejected(['check', badListArgument.source, '--json']);
assert.match(rejectedListArgument.message, /type mismatch|expected|List|Array/i);

const badArrayArgument = createPsliveFixture('proofscript-array-countp-bad-list-', {
  fileName: 'BadArrayCountPList.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: Nat := { Array.countP(Nat, ltFour, List.nil(Nat)) }
`,
});
const rejectedArrayArgument = expectPsliveRejected(['check', badArrayArgument.source, '--json']);
assert.match(rejectedArrayArgument.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-list-countp-bad-result-', {
  fileName: 'BadListCountPResult.ps',
  source: `
function ltFour(x: Nat): Bool := { Nat.ltb(x, 4) }
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Bool := { List.countP(Nat, ltFour, xs) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Bool|Nat/i);

console.log('PSLIVE_LIST_ARRAY_COUNTP=PASS');
