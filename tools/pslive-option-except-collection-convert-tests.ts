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

function assertList(value, expected) {
  const result = [];
  let cursor = value;
  while (true) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) {
      assert.equal(cursor.fields.length, 0);
      break;
    }
    assert.equal(cursor.__psCtor, 1);
    assert.equal(cursor.fields.length, 2);
    result.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  assert.deepEqual(result, expected);
}

function assertArray(value, expected) {
  assert.equal(value.__psInductive, 'Array');
  assert.equal(value.__psCtor, 0);
  assert.equal(value.fields.length, 1);
  assertList(value.fields[0], expected);
}

const fixture = createPsliveFixture('proofscript-option-except-collection-convert-', {
  fileName: 'OptionExceptCollectionConvert.ps',
  source: `
def optSomeArray: Array(Nat) := { Option.toArray(Nat, Option.some(Nat, 7)) }
def optNoneArray: Array(Nat) := { Option.toArray(Nat, Option.none(Nat)) }

def exceptOkList: List(Nat) := { Except.toList(String, Nat, Except.ok(String, Nat, 4)) }
def exceptErrorList: List(Nat) := { Except.toList(String, Nat, Except.error(String, Nat, "bad")) }

theorem opt_some_array_rfl: optSomeArray = Array.singleton(Nat, 7) := by rfl
theorem opt_none_array_rfl: optNoneArray = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem except_ok_list_rfl: exceptOkList = List.singleton(Nat, 4) := by rfl
theorem except_error_list_rfl: exceptErrorList = List.nil(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-collection-convert.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optSomeArray'), 'Option.toArray result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptErrorList'), 'Except.toList result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertArray(jsModule.optSomeArray, [7n]);
assertArray(jsModule.optNoneArray, []);
assertList(jsModule.exceptOkList, [4n]);
assertList(jsModule.exceptErrorList, []);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-collection-convert.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_toArray/, 'TypeScript emission should route Option.toArray through checked runtime helper');
assert.match(tsSource, /Except_toList/, 'TypeScript emission should route Except.toList through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertArray(compiled.optSomeArray, [7n]);
assertArray(compiled.optNoneArray, []);
assertList(compiled.exceptOkList, [4n]);
assertList(compiled.exceptErrorList, []);

const badOptionInput = createPsliveFixture('proofscript-option-toarray-bad-input-', {
  fileName: 'BadOptionToArrayInput.ps',
  source: `
def bad: Array(Nat) := { Option.toArray(Nat, List.singleton(Nat, 1)) }
`,
});
const rejectedOptionInput = expectPsliveRejected(['check', badOptionInput.source, '--json']);
assert.match(rejectedOptionInput.message, /type mismatch|expected|Option|List/i);

const badExceptInput = createPsliveFixture('proofscript-except-tolist-bad-input-', {
  fileName: 'BadExceptToListInput.ps',
  source: `
def bad: List(Nat) := { Except.toList(String, Nat, Option.some(Nat, 1)) }
`,
});
const rejectedExceptInput = expectPsliveRejected(['check', badExceptInput.source, '--json']);
assert.match(rejectedExceptInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_COLLECTION_CONVERT=PASS');
