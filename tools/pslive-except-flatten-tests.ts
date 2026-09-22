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

function assertExcept(value: any, expectedCtor: number, expectedValue: string | bigint) {
  assert.equal(value.__psInductive, 'Except');
  assert.equal(value.__psCtor, expectedCtor);
  assert.equal(value.fields.length, 1);
  assert.equal(value.fields[0], expectedValue);
}

const fixture = createPsliveFixture('proofscript-except-flatten-', {
  fileName: 'ExceptFlatten.ps',
  source: `
def flattenedOkOk: Except(String, Nat) := {
  Except.flatten(String, Nat, Except.ok(String, Except(String, Nat), Except.ok(String, Nat, 5)))
}

def flattenedOkError: Except(String, Nat) := {
  Except.flatten(String, Nat, Except.ok(String, Except(String, Nat), Except.error(String, Nat, "inner")))
}

def flattenedOuterError: Except(String, Nat) := {
  Except.flatten(String, Nat, Except.error(String, Except(String, Nat), "outer"))
}

theorem flattened_ok_ok_rfl: flattenedOkOk = Except.ok(String, Nat, 5) := by rfl
theorem flattened_ok_error_rfl: flattenedOkError = Except.error(String, Nat, "inner") := by rfl
theorem flattened_outer_error_rfl: flattenedOuterError = Except.error(String, Nat, "outer") := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-flatten.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedOkOk'), 'Except.flatten ok/ok result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedOkError'), 'Except.flatten ok/error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedOuterError'), 'Except.flatten outer error result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertExcept(jsModule.flattenedOkOk, 1, 5n);
assertExcept(jsModule.flattenedOkError, 0, 'inner');
assertExcept(jsModule.flattenedOuterError, 0, 'outer');

const { outPath: tsOut } = buildTsFixture(fixture, 'except-flatten.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_flatten/, 'TypeScript emission should route Except.flatten through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertExcept(compiled.flattenedOkOk, 1, 5n);
assertExcept(compiled.flattenedOkError, 0, 'inner');
assertExcept(compiled.flattenedOuterError, 0, 'outer');

const badInput = createPsliveFixture('proofscript-except-flatten-bad-input-', {
  fileName: 'BadExceptFlattenInput.ps',
  source: `
def bad: Except(String, Nat) := { Except.flatten(String, Nat, Except.ok(String, Nat, 1)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Except/i);

console.log('PSLIVE_EXCEPT_FLATTEN=PASS');
