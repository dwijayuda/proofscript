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

const fixture = createPsliveFixture('proofscript-option-except-predicates-', {
  fileName: 'OptionExceptPredicates.ps',
  source: `
def optSome: Bool := { Option.isSome(Nat, Option.some(Nat, 7)) }
def optNoneSome: Bool := { Option.isSome(Nat, Option.none(Nat)) }
def optSomeNone: Bool := { Option.isNone(Nat, Option.some(Nat, 7)) }
def optNone: Bool := { Option.isNone(Nat, Option.none(Nat)) }

def exceptOk: Bool := { Except.isOk(String, Nat, Except.ok(String, Nat, 4)) }
def exceptErrorOk: Bool := { Except.isOk(String, Nat, Except.error(String, Nat, "bad")) }
def exceptOkError: Bool := { Except.isError(String, Nat, Except.ok(String, Nat, 4)) }
def exceptError: Bool := { Except.isError(String, Nat, Except.error(String, Nat, "bad")) }

theorem opt_some_rfl: optSome = true := by rfl
theorem opt_none_some_rfl: optNoneSome = false := by rfl
theorem opt_some_none_rfl: optSomeNone = false := by rfl
theorem opt_none_rfl: optNone = true := by rfl
theorem except_ok_rfl: exceptOk = true := by rfl
theorem except_error_ok_rfl: exceptErrorOk = false := by rfl
theorem except_ok_error_rfl: exceptOkError = false := by rfl
theorem except_error_rfl: exceptError = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-predicates.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optSome'), 'Option predicate results must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptError'), 'Except predicate results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.optSome, true);
assert.equal(jsModule.optNoneSome, false);
assert.equal(jsModule.optSomeNone, false);
assert.equal(jsModule.optNone, true);
assert.equal(jsModule.exceptOk, true);
assert.equal(jsModule.exceptErrorOk, false);
assert.equal(jsModule.exceptOkError, false);
assert.equal(jsModule.exceptError, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-predicates.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_isSome/, 'TypeScript emission should route Option.isSome through checked runtime helper');
assert.match(tsSource, /Option_isNone/, 'TypeScript emission should route Option.isNone through checked runtime helper');
assert.match(tsSource, /Except_isOk/, 'TypeScript emission should route Except.isOk through checked runtime helper');
assert.match(tsSource, /Except_isError/, 'TypeScript emission should route Except.isError through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.optSome, true);
assert.equal(compiled.optNone, true);
assert.equal(compiled.exceptOk, true);
assert.equal(compiled.exceptError, true);

const badOptionInput = createPsliveFixture('proofscript-option-issome-bad-input-', {
  fileName: 'BadOptionIsSomeInput.ps',
  source: `
def bad: Bool := { Option.isSome(Nat, Except.ok(String, Nat, 1)) }
`,
});
const rejectedOption = expectPsliveRejected(['check', badOptionInput.source, '--json']);
assert.match(rejectedOption.message, /type mismatch|expected|Option|Except/i);

const badExceptInput = createPsliveFixture('proofscript-except-isok-bad-input-', {
  fileName: 'BadExceptIsOkInput.ps',
  source: `
def bad: Bool := { Except.isOk(String, Nat, Option.some(Nat, 1)) }
`,
});
const rejectedExcept = expectPsliveRejected(['check', badExceptInput.source, '--json']);
assert.match(rejectedExcept.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_PREDICATES=PASS');
