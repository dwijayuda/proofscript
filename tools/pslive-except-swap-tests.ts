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

const fixture = createPsliveFixture('proofscript-except-swap-', {
  fileName: 'ExceptSwap.ps',
  source: `
def swappedError: Except(Nat, String) := {
  Except.swap(String, Nat, Except.error(String, Nat, "bad"))
}

def swappedOk: Except(Nat, String) := {
  Except.swap(String, Nat, Except.ok(String, Nat, 7))
}

theorem swapped_error_rfl: swappedError = Except.ok(Nat, String, "bad") := by rfl
theorem swapped_ok_rfl: swappedOk = Except.error(Nat, String, 7) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-swap.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'swappedError'), 'Except.swap error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'swappedOk'), 'Except.swap ok result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertExcept(jsModule.swappedError, 1, 'bad');
assertExcept(jsModule.swappedOk, 0, 7n);

const { outPath: tsOut } = buildTsFixture(fixture, 'except-swap.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_swap/, 'TypeScript emission should route Except.swap through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertExcept(compiled.swappedError, 1, 'bad');
assertExcept(compiled.swappedOk, 0, 7n);

const badExpected = createPsliveFixture('proofscript-except-swap-bad-expected-', {
  fileName: 'BadExceptSwapExpected.ps',
  source: `
def bad: Except(String, Nat) := { Except.swap(String, Nat, Except.ok(String, Nat, 1)) }
`,
});
const rejectedExpected = expectPsliveRejected(['check', badExpected.source, '--json']);
assert.match(rejectedExpected.message, /type mismatch|expected|Except|String|Nat/i);

const badInput = createPsliveFixture('proofscript-except-swap-bad-input-', {
  fileName: 'BadExceptSwapInput.ps',
  source: `
def bad: Except(Nat, String) := { Except.swap(String, Nat, Option.some(Nat, 1)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_EXCEPT_SWAP=PASS');
