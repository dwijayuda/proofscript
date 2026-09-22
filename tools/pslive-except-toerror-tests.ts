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

function assertOption(value: any, expectedCtor: number, expectedValue?: string) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, expectedCtor);
  if (expectedCtor === 0) assert.equal(value.fields.length, 0);
  else {
    assert.equal(value.fields.length, 1);
    assert.equal(value.fields[0], expectedValue);
  }
}

const fixture = createPsliveFixture('proofscript-except-toerror-', {
  fileName: 'ExceptToError.ps',
  source: `
def extractedError: Option(String) := {
  Except.toError(String, Nat, Except.error(String, Nat, "bad"))
}

def extractedOk: Option(String) := {
  Except.toError(String, Nat, Except.ok(String, Nat, 7))
}

theorem extracted_error_rfl: extractedError = Option.some(String, "bad") := by rfl
theorem extracted_ok_rfl: extractedOk = Option.none(String) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-toerror.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'extractedError'), 'Except.toError error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'extractedOk'), 'Except.toError ok result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertOption(jsModule.extractedError, 1, 'bad');
assertOption(jsModule.extractedOk, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'except-toerror.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_toError/, 'TypeScript emission should route Except.toError through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertOption(compiled.extractedError, 1, 'bad');
assertOption(compiled.extractedOk, 0);

const badInput = createPsliveFixture('proofscript-except-toerror-bad-input-', {
  fileName: 'BadExceptToErrorInput.ps',
  source: `
def bad: Option(Nat) := { Except.toError(String, Nat, Except.error(String, Nat, "bad")) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Option|String|Nat/i);

console.log('PSLIVE_EXCEPT_TOERROR=PASS');
