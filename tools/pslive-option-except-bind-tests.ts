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

const fixture = createPsliveFixture('proofscript-option-except-bind-', {
  fileName: 'OptionExceptBind.ps',
  source: `
function someSucc(x: Nat): Option(Nat) := { Option.some(Nat, x + 1) }
function alwaysNone(x: Nat): Option(Nat) := { Option.none(Nat) }
function okSucc(x: Nat): Except(String, Nat) := { Except.ok(String, Nat, x + 1) }
function failWithBad(x: Nat): Except(String, Nat) := { Except.error(String, Nat, "bad") }

-- P5.16 intentionally supports explicit checked calls only.
def boundSome: Option(Nat) := { Option.bind(Nat, Nat, Option.some(Nat, 2), someSucc) }
def boundNone: Option(Nat) := { Option.bind(Nat, Nat, Option.none(Nat), someSucc) }
def boundSomeToNone: Option(Nat) := { Option.bind(Nat, Nat, Option.some(Nat, 2), alwaysNone) }

def boundOk: Except(String, Nat) := { Except.bind(String, Nat, Nat, Except.ok(String, Nat, 4), okSucc) }
def boundError: Except(String, Nat) := { Except.bind(String, Nat, Nat, Except.error(String, Nat, "bad"), okSucc) }
def boundOkToError: Except(String, Nat) := { Except.bind(String, Nat, Nat, Except.ok(String, Nat, 4), failWithBad) }

theorem bound_some_rfl: boundSome = Option.some(Nat, 3) := by rfl
theorem bound_none_rfl: boundNone = Option.none(Nat) := by rfl
theorem bound_some_to_none_rfl: boundSomeToNone = Option.none(Nat) := by rfl
theorem bound_ok_rfl: boundOk = Except.ok(String, Nat, 5) := by rfl
theorem bound_error_rfl: boundError = Except.error(String, Nat, "bad") := by rfl
theorem bound_ok_to_error_rfl: boundOkToError = Except.error(String, Nat, "bad") := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-bind.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'boundSome'), 'Option.bind results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.boundSome.__psInductive, 'Option');
assert.equal(jsModule.boundSome.__psCtor, 1);
assert.deepEqual(jsModule.boundSome.fields, [3n]);
assert.equal(jsModule.boundNone.__psInductive, 'Option');
assert.equal(jsModule.boundNone.__psCtor, 0);
assert.equal(jsModule.boundSomeToNone.__psCtor, 0);
assert.equal(jsModule.boundOk.__psInductive, 'Except');
assert.equal(jsModule.boundOk.__psCtor, 1);
assert.deepEqual(jsModule.boundOk.fields, [5n]);
assert.equal(jsModule.boundError.__psInductive, 'Except');
assert.equal(jsModule.boundError.__psCtor, 0);
assert.deepEqual(jsModule.boundError.fields, ['bad']);
assert.equal(jsModule.boundOkToError.__psCtor, 0);
assert.deepEqual(jsModule.boundOkToError.fields, ['bad']);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-bind.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_bind/, 'TypeScript emission should route through checked Option.bind helper');
assert.match(tsSource, /Except_bind/, 'TypeScript emission should route through checked Except.bind helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(compiled.boundSome.fields, [3n]);
assert.deepEqual(compiled.boundOk.fields, [5n]);
assert.deepEqual(compiled.boundError.fields, ['bad']);

const badOptionBindFunction = createPsliveFixture('proofscript-option-bind-bad-function-', {
  fileName: 'BadOptionBindFunction.ps',
  source: `
function boolId(b: Bool): Option(Bool) := { Option.some(Bool, b) }
def bad: Option(Nat) := { Option.bind(Nat, Nat, Option.some(Nat, 1), boolId) }
`,
});
const rejectedOptionFunction = expectPsliveRejected(['check', badOptionBindFunction.source, '--json']);
assert.match(rejectedOptionFunction.message, /type mismatch|expected Pi-domain type|wrong type|Bool|Nat/i);

const badExceptBindResult = createPsliveFixture('proofscript-except-bind-bad-result-', {
  fileName: 'BadExceptBindResult.ps',
  source: `
function returnsBool(x: Nat): Except(String, Bool) := { Except.ok(String, Bool, x == 0) }
def bad: Except(String, Nat) := { Except.bind(String, Nat, Bool, Except.ok(String, Nat, 0), returnsBool) }
`,
});
const rejectedExceptResult = expectPsliveRejected(['check', badExceptBindResult.source, '--json']);
assert.match(rejectedExceptResult.message, /type mismatch|expected|Except|Bool|Nat/i);

console.log('PSLIVE_OPTION_EXCEPT_BIND=PASS');
