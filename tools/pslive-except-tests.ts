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

const fixture = createPsliveFixture('proofscript-except-', {
  fileName: 'Except.ps',
  source: `
def okSeven: Except(String, Nat) := { Except.ok(String, Nat, 7) }
def errorMessage: Except(String, Nat) := { Except.error(String, Nat, "bad") }

function unwrapOrZero(result: Except(String, Nat)): Nat := {
  match (result) {
    | Except.error message => 0
    | Except.ok value => value
  }
}

function isOk(result: Except(String, Nat)): Bool := {
  match (result) {
    | Except.error message => false
    | Except.ok value => true
  }
}

def unwrappedOk: Nat := { unwrapOrZero(okSeven) }
def unwrappedError: Nat := { unwrapOrZero(errorMessage) }
def okFlag: Bool := { isOk(okSeven) }
def errorFlag: Bool := { isOk(errorMessage) }

theorem unwrap_ok_rfl: unwrappedOk = 7 := by rfl
theorem unwrap_error_rfl: unwrappedError = 0 := by rfl
theorem ok_flag_rfl: okFlag = true := by rfl
theorem error_flag_rfl: errorFlag = false := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'unwrappedOk'), 'Except results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.unwrappedOk, 7n);
assert.equal(jsModule.unwrappedError, 0n);
assert.equal(jsModule.okFlag, true);
assert.equal(jsModule.errorFlag, false);
assert.equal(jsModule.okSeven.__psInductive, 'Except');
assert.equal(jsModule.okSeven.__psCtor, 1);
assert.equal(jsModule.errorMessage.__psInductive, 'Except');
assert.equal(jsModule.errorMessage.__psCtor, 0);
assert.deepEqual(jsModule.okSeven.fields, [7n]);
assert.deepEqual(jsModule.errorMessage.fields, ['bad']);

const { outPath: tsOut } = buildTsFixture(fixture, 'except.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Struct_mk\("Except", 1, \[7n\]\)/, 'Except.ok should erase type parameters and emit payload field');
assert.match(tsSource, /Struct_mk\("Except", 0, \["bad"\]\)/, 'Except.error should erase type parameters and emit error field');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.unwrappedOk, 7n);
assert.equal(compiled.unwrappedError, 0n);
assert.equal(compiled.okFlag, true);
assert.equal(compiled.errorFlag, false);

const badNonExhaustive = createPsliveFixture('proofscript-except-bad-non-exhaustive-', {
  fileName: 'BadNonExhaustiveExcept.ps',
  source: `
function bad(result: Except(String, Nat)): Nat := {
  match (result) {
    | Except.ok value => value
  }
}
`,
});
const nonExhaustive = expectPsliveRejected(['check', badNonExhaustive.source, '--json']);
assert.match(nonExhaustive.message, /non-exhaustive/i);

const badOkPayload = createPsliveFixture('proofscript-except-bad-ok-payload-', {
  fileName: 'BadExceptOkPayload.ps',
  source: `
def bad: Except(String, Nat) := { Except.ok(String, Nat, true) }
`,
});
const wrongOkPayload = expectPsliveRejected(['check', badOkPayload.source, '--json']);
assert.match(wrongOkPayload.message, /wrong type|expected Pi-domain type|argument|Bool/i);

const badErrorPayload = createPsliveFixture('proofscript-except-bad-error-payload-', {
  fileName: 'BadExceptErrorPayload.ps',
  source: `
def bad: Except(String, Nat) := { Except.error(String, Nat, 3) }
`,
});
const wrongErrorPayload = expectPsliveRejected(['check', badErrorPayload.source, '--json']);
assert.match(wrongErrorPayload.message, /wrong type|expected Pi-domain type|argument|String|Nat/i);

console.log('PSLIVE_EXCEPT=PASS');
