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

const fixture = createPsliveFixture('proofscript-list-array-last-', {
  fileName: 'ListArrayLast.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) }
def singleton: List(Nat) := { List.cons(Nat, 7, List.nil(Nat)) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listLast: Option(Nat) := { List.last?(Nat, xs) }
def listLastSingleton: Option(Nat) := { List.last?(Nat, singleton) }
def listLastEmpty: Option(Nat) := { List.last?(Nat, emptyList) }

def arr: Array(Nat) := { [7, 2, 9] }
def arrSingleton: Array(Nat) := { [7] }
def arrEmpty: Array(Nat) := { [] }

def arrayLast: Option(Nat) := { Array.last?(Nat, arr) }
def arrayLastSingleton: Option(Nat) := { Array.last?(Nat, arrSingleton) }
def arrayLastEmpty: Option(Nat) := { Array.last?(Nat, arrEmpty) }

theorem list_last_rfl: listLast = Option.some(Nat, 9) := by rfl
theorem list_last_singleton_rfl: listLastSingleton = Option.some(Nat, 7) := by rfl
theorem list_last_empty_rfl: listLastEmpty = Option.none(Nat) := by rfl
theorem array_last_rfl: arrayLast = Option.some(Nat, 9) := by rfl
theorem array_last_singleton_rfl: arrayLastSingleton = Option.some(Nat, 7) := by rfl
theorem array_last_empty_rfl: arrayLastEmpty = Option.none(Nat) := by rfl
`,
});

function optionPayload(value: any): any | undefined {
  assert.equal(value.__psInductive, 'Option');
  if (value.__psCtor === 0) {
    assert.deepEqual(value.fields, []);
    return undefined;
  }
  assert.equal(value.__psCtor, 1);
  assert.equal(value.fields.length, 1);
  return value.fields[0];
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-last.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listLast'), 'List.last? result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayLast'), 'Array.last? result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(optionPayload(jsModule.listLast), 9n);
assert.deepEqual(optionPayload(jsModule.listLastSingleton), 7n);
assert.equal(optionPayload(jsModule.listLastEmpty), undefined);
assert.deepEqual(optionPayload(jsModule.arrayLast), 9n);
assert.deepEqual(optionPayload(jsModule.arrayLastSingleton), 7n);
assert.equal(optionPayload(jsModule.arrayLastEmpty), undefined);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-last.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_lastOpt/, 'TypeScript emission should route List.last? through the checked runtime helper');
assert.match(tsSource, /Array_lastOpt/, 'TypeScript emission should route Array.last? through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(optionPayload(compiled.listLast), 9n);
assert.deepEqual(optionPayload(compiled.listLastSingleton), 7n);
assert.equal(optionPayload(compiled.listLastEmpty), undefined);
assert.deepEqual(optionPayload(compiled.arrayLast), 9n);
assert.deepEqual(optionPayload(compiled.arrayLastSingleton), 7n);
assert.equal(optionPayload(compiled.arrayLastEmpty), undefined);

const badListLast = createPsliveFixture('proofscript-list-last-bad-array-', {
  fileName: 'BadListLastArray.ps',
  source: `
def bad: Option(Nat) := { List.last?(Nat, [1, 2]) }
`,
});
const rejectedListLast = expectPsliveRejected(['check', badListLast.source, '--json']);
assert.match(rejectedListLast.message, /type mismatch|expected|List|Array/i);

const badArrayLast = createPsliveFixture('proofscript-array-last-bad-list-', {
  fileName: 'BadArrayLastList.ps',
  source: `
def bad: Option(Nat) := { Array.last?(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayLast = expectPsliveRejected(['check', badArrayLast.source, '--json']);
assert.match(rejectedArrayLast.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-array-last-bad-result-', {
  fileName: 'BadArrayLastResult.ps',
  source: `
def bad: Nat := { Array.last?(Nat, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|Nat/i);

console.log('PSLIVE_LIST_ARRAY_LAST=PASS');
