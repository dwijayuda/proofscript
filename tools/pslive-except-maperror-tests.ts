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

function assertExcept(value, expectedCtor, expectedValue) {
  assert.equal(value.__psInductive, 'Except');
  assert.equal(value.__psCtor, expectedCtor);
  assert.equal(value.fields.length, 1);
  assert.equal(value.fields[0], expectedValue);
}

const fixture = createPsliveFixture('proofscript-except-maperror-', {
  fileName: 'ExceptMapError.ps',
  source: `
def stringifyError(e: String): String := { "mapped" }

def mappedError: Except(String, Nat) := { Except.mapError(String, String, Nat, stringifyError, Except.error(String, Nat, "bad")) }
def mappedOk: Except(String, Nat) := { Except.mapError(String, String, Nat, stringifyError, Except.ok(String, Nat, 11)) }

theorem mapped_error_rfl: mappedError = Except.error(String, Nat, "mapped") := by rfl
theorem mapped_ok_rfl: mappedOk = Except.ok(String, Nat, 11) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-maperror.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'mappedError'), 'Except.mapError error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'mappedOk'), 'Except.mapError ok result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertExcept(jsModule.mappedError, 0, 'mapped');
assertExcept(jsModule.mappedOk, 1, 11n);

const { outPath: tsOut } = buildTsFixture(fixture, 'except-maperror.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_mapError/, 'TypeScript emission should route Except.mapError through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertExcept(compiled.mappedError, 0, 'mapped');
assertExcept(compiled.mappedOk, 1, 11n);

const badMapper = createPsliveFixture('proofscript-except-maperror-bad-mapper-', {
  fileName: 'BadExceptMapErrorMapper.ps',
  source: `
def natId(n: Nat): Nat := { n }
def bad: Except(String, Nat) := { Except.mapError(String, String, Nat, natId, Except.error(String, Nat, "bad")) }
`,
});
const rejectedMapper = expectPsliveRejected(['check', badMapper.source, '--json']);
assert.match(rejectedMapper.message, /type mismatch|expected|String|Nat/i);

const badInput = createPsliveFixture('proofscript-except-maperror-bad-input-', {
  fileName: 'BadExceptMapErrorInput.ps',
  source: `
def stringifyError(e: String): String := { "mapped" }
def bad: Except(String, Nat) := { Except.mapError(String, String, Nat, stringifyError, Option.some(Nat, 1)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_EXCEPT_MAPERROR=PASS');
