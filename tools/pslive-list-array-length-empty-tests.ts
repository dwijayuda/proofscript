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

const fixture = createPsliveFixture('proofscript-list-array-length-empty-', {
  fileName: 'ListArrayLengthEmpty.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }
def xsLength: Nat := { List.length(Nat, xs) }
def emptyLength: Nat := { List.length(Nat, emptyList) }

def arr: Array(Nat) := { [1, 2, 3] }
def emptyArray: Array(Nat) := { [] }
def arrIsEmpty: Bool := { Array.isEmpty(Nat, arr) }
def emptyArrayIsEmpty: Bool := { Array.isEmpty(Nat, emptyArray) }

theorem xs_length_rfl: xsLength = 3 := by rfl
theorem empty_length_rfl: emptyLength = 0 := by rfl
theorem arr_is_empty_rfl: arrIsEmpty = false := by rfl
theorem empty_array_is_empty_rfl: emptyArrayIsEmpty = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-length-empty.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'xsLength'), 'List.length result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrIsEmpty'), 'Array.isEmpty result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.xsLength, 3n);
assert.equal(jsModule.emptyLength, 0n);
assert.equal(jsModule.arrIsEmpty, false);
assert.equal(jsModule.emptyArrayIsEmpty, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-length-empty.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_length/, 'TypeScript emission should route List.length through the checked runtime helper');
assert.match(tsSource, /Array_isEmpty/, 'TypeScript emission should route Array.isEmpty through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.xsLength, 3n);
assert.equal(compiled.emptyArrayIsEmpty, true);

const badListLength = createPsliveFixture('proofscript-list-length-bad-array-', {
  fileName: 'BadListLengthArray.ps',
  source: `
def bad: Nat := { List.length(Nat, [1, 2]) }
`,
});
const rejectedListLength = expectPsliveRejected(['check', badListLength.source, '--json']);
assert.match(rejectedListLength.message, /type mismatch|expected|List|Array/i);

const badArrayIsEmpty = createPsliveFixture('proofscript-array-isempty-bad-list-', {
  fileName: 'BadArrayIsEmptyList.ps',
  source: `
def bad: Bool := { Array.isEmpty(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayIsEmpty = expectPsliveRejected(['check', badArrayIsEmpty.source, '--json']);
assert.match(rejectedArrayIsEmpty.message, /type mismatch|expected|Array|List/i);

console.log('PSLIVE_LIST_ARRAY_LENGTH_EMPTY=PASS');
