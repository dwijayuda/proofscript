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

function assertOptionSome(value, expected) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, 1);
  assert.deepEqual(value.fields, [expected]);
}

function assertOptionNone(value) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, 0);
  assert.deepEqual(value.fields, []);
}

const fixture = createPsliveFixture('proofscript-option-except-convert-', {
  fileName: 'OptionExceptConvert.ps',
  source: `
def optSomeList: List(Nat) := { Option.toList(Nat, Option.some(Nat, 7)) }
def optNoneList: List(Nat) := { Option.toList(Nat, Option.none(Nat)) }

def exceptOkOption: Option(Nat) := { Except.toOption(String, Nat, Except.ok(String, Nat, 4)) }
def exceptErrorOption: Option(Nat) := { Except.toOption(String, Nat, Except.error(String, Nat, "bad")) }

theorem opt_some_list_rfl: optSomeList = List.singleton(Nat, 7) := by rfl
theorem opt_none_list_rfl: optNoneList = List.nil(Nat) := by rfl
theorem except_ok_option_rfl: exceptOkOption = Option.some(Nat, 4) := by rfl
theorem except_error_option_rfl: exceptErrorOption = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-convert.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optSomeList'), 'Option.toList result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptErrorOption'), 'Except.toOption result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertList(jsModule.optSomeList, [7n]);
assertList(jsModule.optNoneList, []);
assertOptionSome(jsModule.exceptOkOption, 4n);
assertOptionNone(jsModule.exceptErrorOption);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-convert.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_toList/, 'TypeScript emission should route Option.toList through checked runtime helper');
assert.match(tsSource, /Except_toOption/, 'TypeScript emission should route Except.toOption through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertList(compiled.optSomeList, [7n]);
assertList(compiled.optNoneList, []);
assertOptionSome(compiled.exceptOkOption, 4n);
assertOptionNone(compiled.exceptErrorOption);

const badOptionInput = createPsliveFixture('proofscript-option-tolist-bad-input-', {
  fileName: 'BadOptionToListInput.ps',
  source: `
def bad: List(Nat) := { Option.toList(Nat, List.singleton(Nat, 1)) }
`,
});
const rejectedOptionInput = expectPsliveRejected(['check', badOptionInput.source, '--json']);
assert.match(rejectedOptionInput.message, /type mismatch|expected|Option|List/i);

const badExceptInput = createPsliveFixture('proofscript-except-tooption-bad-input-', {
  fileName: 'BadExceptToOptionInput.ps',
  source: `
def bad: Option(Nat) := { Except.toOption(String, Nat, Option.some(Nat, 1)) }
`,
});
const rejectedExceptInput = expectPsliveRejected(['check', badExceptInput.source, '--json']);
assert.match(rejectedExceptInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_CONVERT=PASS');
