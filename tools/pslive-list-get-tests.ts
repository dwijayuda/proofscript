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

const fixture = createPsliveFixture('proofscript-list-get-', {
  fileName: 'ListGet.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def first: Option(Nat) := { List.get?(Nat, xs, 0) }
def second: Option(Nat) := { List.get?(Nat, xs, 1) }
def last: Option(Nat) := { List.get?(Nat, xs, 2) }
def missing: Option(Nat) := { List.get?(Nat, xs, 3) }
def emptyMissing: Option(Nat) := { List.get?(Nat, emptyList, 0) }

theorem first_rfl: first = Option.some(Nat, 7) := by rfl
theorem second_rfl: second = Option.some(Nat, 2) := by rfl
theorem last_rfl: last = Option.some(Nat, 9) := by rfl
theorem missing_rfl: missing = Option.none(Nat) := by rfl
theorem empty_missing_rfl: emptyMissing = Option.none(Nat) := by rfl
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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-get.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'first'), 'List.get? first result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(optionPayload(jsModule.first), 7n);
assert.equal(optionPayload(jsModule.second), 2n);
assert.equal(optionPayload(jsModule.last), 9n);
assert.equal(optionPayload(jsModule.missing), undefined);
assert.equal(optionPayload(jsModule.emptyMissing), undefined);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-get.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_getOpt/, 'TypeScript emission should route List.get? through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(optionPayload(compiled.first), 7n);
assert.equal(optionPayload(compiled.second), 2n);
assert.equal(optionPayload(compiled.last), 9n);
assert.equal(optionPayload(compiled.missing), undefined);
assert.equal(optionPayload(compiled.emptyMissing), undefined);

const badIndexType = createPsliveFixture('proofscript-list-get-bad-index-', {
  fileName: 'BadListGetIndex.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Option(Nat) := { List.get?(Nat, xs, "0") }
`,
});
const rejectedIndex = expectPsliveRejected(['check', badIndexType.source, '--json']);
assert.match(rejectedIndex.message, /type mismatch|expected Nat|String/i);

const badListType = createPsliveFixture('proofscript-list-get-bad-array-', {
  fileName: 'BadListGetArray.ps',
  source: `
def bad: Option(Nat) := { List.get?(Nat, [1, 2], 0) }
`,
});
const rejectedList = expectPsliveRejected(['check', badListType.source, '--json']);
assert.match(rejectedList.message, /type mismatch|expected|List|Array/i);

const badResult = createPsliveFixture('proofscript-list-get-bad-result-', {
  fileName: 'BadListGetResult.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 1, List.nil(Nat)) }
def bad: Nat := { List.get?(Nat, xs, 0) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|Nat/i);

console.log('PSLIVE_LIST_GET=PASS');
