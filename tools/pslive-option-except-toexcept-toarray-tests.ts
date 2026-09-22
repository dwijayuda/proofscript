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

function assertOption(value, expectedCtor, expectedValue) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, expectedCtor);
  if (expectedCtor === 0) {
    assert.equal(value.fields.length, 0);
  } else {
    assert.equal(value.fields.length, 1);
    assert.equal(value.fields[0], expectedValue);
  }
}

function assertExcept(value, expectedCtor, expectedValue) {
  assert.equal(value.__psInductive, 'Except');
  assert.equal(value.__psCtor, expectedCtor);
  assert.equal(value.fields.length, 1);
  assert.equal(value.fields[0], expectedValue);
}

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

const fixture = createPsliveFixture('proofscript-option-except-toexcept-toarray-', {
  fileName: 'OptionExceptToExceptToArray.ps',
  source: `
def optionSomeExcept: Except(String, Nat) := { Option.toExcept(String, Nat, Option.some(Nat, 5), "missing") }
def optionNoneExcept: Except(String, Nat) := { Option.toExcept(String, Nat, Option.none(Nat), "missing") }

def exceptOkArray: Array(Nat) := { Except.toArray(String, Nat, Except.ok(String, Nat, 8)) }
def exceptErrorArray: Array(Nat) := { Except.toArray(String, Nat, Except.error(String, Nat, "bad")) }

def roundTripSome: Option(Nat) := { Except.toOption(String, Nat, Option.toExcept(String, Nat, Option.some(Nat, 9), "missing")) }
def roundTripNone: Option(Nat) := { Except.toOption(String, Nat, Option.toExcept(String, Nat, Option.none(Nat), "missing")) }

theorem option_some_toexcept_rfl: optionSomeExcept = Except.ok(String, Nat, 5) := by rfl
theorem option_none_toexcept_rfl: optionNoneExcept = Except.error(String, Nat, "missing") := by rfl
theorem except_ok_toarray_rfl: exceptOkArray = Array.singleton(Nat, 8) := by rfl
theorem except_error_toarray_rfl: exceptErrorArray = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem round_trip_some_rfl: roundTripSome = Option.some(Nat, 9) := by rfl
theorem round_trip_none_rfl: roundTripNone = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-toexcept-toarray.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optionSomeExcept'), 'Option.toExcept result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptErrorArray'), 'Except.toArray result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertExcept(jsModule.optionSomeExcept, 1, 5n);
assertExcept(jsModule.optionNoneExcept, 0, 'missing');
assertArray(jsModule.exceptOkArray, [8n]);
assertArray(jsModule.exceptErrorArray, []);
assertOption(jsModule.roundTripSome, 1, 9n);
assertOption(jsModule.roundTripNone, 0, undefined);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-toexcept-toarray.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_toExcept/, 'TypeScript emission should route Option.toExcept through checked runtime helper');
assert.match(tsSource, /Except_toArray/, 'TypeScript emission should route Except.toArray through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertExcept(compiled.optionSomeExcept, 1, 5n);
assertExcept(compiled.optionNoneExcept, 0, 'missing');
assertArray(compiled.exceptOkArray, [8n]);
assertArray(compiled.exceptErrorArray, []);
assertOption(compiled.roundTripSome, 1, 9n);
assertOption(compiled.roundTripNone, 0, undefined);

const badOptionInput = createPsliveFixture('proofscript-option-toexcept-bad-input-', {
  fileName: 'BadOptionToExceptInput.ps',
  source: `
def bad: Except(String, Nat) := { Option.toExcept(String, Nat, List.singleton(Nat, 1), "missing") }
`,
});
const rejectedOptionInput = expectPsliveRejected(['check', badOptionInput.source, '--json']);
assert.match(rejectedOptionInput.message, /type mismatch|expected|Option|List/i);

const badErrorInput = createPsliveFixture('proofscript-option-toexcept-bad-error-', {
  fileName: 'BadOptionToExceptError.ps',
  source: `
def bad: Except(String, Nat) := { Option.toExcept(String, Nat, Option.none(Nat), 7) }
`,
});
const rejectedErrorInput = expectPsliveRejected(['check', badErrorInput.source, '--json']);
assert.match(rejectedErrorInput.message, /type mismatch|expected|String|Nat/i);

const badExceptInput = createPsliveFixture('proofscript-except-toarray-bad-input-', {
  fileName: 'BadExceptToArrayInput.ps',
  source: `
def bad: Array(Nat) := { Except.toArray(String, Nat, Option.some(Nat, 1)) }
`,
});
const rejectedExceptInput = expectPsliveRejected(['check', badExceptInput.source, '--json']);
assert.match(rejectedExceptInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_TOEXCEPT_TOARRAY=PASS');
