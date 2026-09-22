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

const fixture = createPsliveFixture('proofscript-list-isempty-', {
  fileName: 'ListIsEmpty.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.nil(Nat))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listIsEmptyFalse: Bool := { List.isEmpty(Nat, xs) }
def listIsEmptyTrue: Bool := { List.isEmpty(Nat, emptyList) }
def arrayIsEmptyFalse: Bool := { Array.isEmpty(Nat, [7, 2]) }
def arrayIsEmptyTrue: Bool := { Array.isEmpty(Nat, []) }

theorem list_is_empty_false_rfl: listIsEmptyFalse = false := by rfl
theorem list_is_empty_true_rfl: listIsEmptyTrue = true := by rfl
theorem array_is_empty_false_regression: arrayIsEmptyFalse = false := by rfl
theorem array_is_empty_true_regression: arrayIsEmptyTrue = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-isempty.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listIsEmptyFalse'), 'List.isEmpty false result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'listIsEmptyTrue'), 'List.isEmpty true result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listIsEmptyFalse, false);
assert.equal(jsModule.listIsEmptyTrue, true);
assert.equal(jsModule.arrayIsEmptyFalse, false);
assert.equal(jsModule.arrayIsEmptyTrue, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-isempty.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_isEmpty/, 'TypeScript emission should route List.isEmpty through the checked runtime helper');
assert.match(tsSource, /Array_isEmpty/, 'TypeScript emission should preserve Array.isEmpty helper routing');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.listIsEmptyFalse, false);
assert.equal(compiled.listIsEmptyTrue, true);
assert.equal(compiled.arrayIsEmptyFalse, false);
assert.equal(compiled.arrayIsEmptyTrue, true);

const badCollection = createPsliveFixture('proofscript-list-isempty-bad-array-', {
  fileName: 'BadListIsEmptyArray.ps',
  source: `
def bad: Bool := { List.isEmpty(Nat, [1, 2]) }
`,
});
const rejectedCollection = expectPsliveRejected(['check', badCollection.source, '--json']);
assert.match(rejectedCollection.message, /type mismatch|expected|List|Array/i);

const badResult = createPsliveFixture('proofscript-list-isempty-bad-result-', {
  fileName: 'BadListIsEmptyResult.ps',
  source: `
def bad: Nat := { List.isEmpty(Nat, List.nil(Nat)) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Bool|Nat/i);

console.log('PSLIVE_LIST_ISEMPTY=PASS');
