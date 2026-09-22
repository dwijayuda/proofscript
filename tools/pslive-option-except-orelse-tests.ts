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

function assertOptionSome(value, expected) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, 1);
  assert.deepEqual(value.fields, [expected]);
}

function assertExceptOk(value, expected) {
  assert.equal(value.__psInductive, 'Except');
  assert.equal(value.__psCtor, 1);
  assert.deepEqual(value.fields, [expected]);
}

const fixture = createPsliveFixture('proofscript-option-except-orelse-', {
  fileName: 'OptionExceptOrElse.ps',
  source: `
def optSomeOrElse: Option(Nat) := { Option.orElse(Nat, Option.some(Nat, 7), Option.some(Nat, 99)) }
def optNoneOrElse: Option(Nat) := { Option.orElse(Nat, Option.none(Nat), Option.some(Nat, 99)) }

def exceptOkOrElse: Except(String, Nat) := { Except.orElse(String, Nat, Except.ok(String, Nat, 4), Except.ok(String, Nat, 99)) }
def exceptErrorOrElse: Except(String, Nat) := { Except.orElse(String, Nat, Except.error(String, Nat, "bad"), Except.ok(String, Nat, 99)) }

theorem opt_some_orelse_rfl: optSomeOrElse = Option.some(Nat, 7) := by rfl
theorem opt_none_orelse_rfl: optNoneOrElse = Option.some(Nat, 99) := by rfl
theorem except_ok_orelse_rfl: exceptOkOrElse = Except.ok(String, Nat, 4) := by rfl
theorem except_error_orelse_rfl: exceptErrorOrElse = Except.ok(String, Nat, 99) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-orelse.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optSomeOrElse'), 'Option.orElse results must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptErrorOrElse'), 'Except.orElse results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertOptionSome(jsModule.optSomeOrElse, 7n);
assertOptionSome(jsModule.optNoneOrElse, 99n);
assertExceptOk(jsModule.exceptOkOrElse, 4n);
assertExceptOk(jsModule.exceptErrorOrElse, 99n);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-orelse.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_orElse/, 'TypeScript emission should route Option.orElse through checked runtime helper');
assert.match(tsSource, /Except_orElse/, 'TypeScript emission should route Except.orElse through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertOptionSome(compiled.optSomeOrElse, 7n);
assertOptionSome(compiled.optNoneOrElse, 99n);
assertExceptOk(compiled.exceptOkOrElse, 4n);
assertExceptOk(compiled.exceptErrorOrElse, 99n);

const badOptionFallback = createPsliveFixture('proofscript-option-orelse-bad-fallback-', {
  fileName: 'BadOptionOrElseFallback.ps',
  source: `
def bad: Option(Nat) := { Option.orElse(Nat, Option.none(Nat), Option.some(Bool, true)) }
`,
});
const rejectedOptionFallback = expectPsliveRejected(['check', badOptionFallback.source, '--json']);
assert.match(rejectedOptionFallback.message, /type mismatch|expected|Bool|Nat|Option/i);

const badExceptFallback = createPsliveFixture('proofscript-except-orelse-bad-fallback-', {
  fileName: 'BadExceptOrElseFallback.ps',
  source: `
def bad: Except(String, Nat) := { Except.orElse(String, Nat, Except.error(String, Nat, "bad"), Option.some(Nat, 1)) }
`,
});
const rejectedExceptFallback = expectPsliveRejected(['check', badExceptFallback.source, '--json']);
assert.match(rejectedExceptFallback.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_ORELSE=PASS');
