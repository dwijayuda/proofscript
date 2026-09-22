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

const fixture = createPsliveFixture('proofscript-option-except-map-', {
  fileName: 'OptionExceptMap.ps',
  source: `
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def mappedSome: Option(Nat) := { Option.map(Nat, Nat, inc, Option.some(Nat, 2)) }
def mappedNone: Option(Nat) := { Option.map(Nat, Nat, inc, Option.none(Nat)) }
def mappedBool: Option(Bool) := { Option.map(Nat, Bool, isZero, Option.some(Nat, 0)) }

def mappedOk: Except(String, Nat) := { Except.map(String, Nat, Nat, inc, Except.ok(String, Nat, 4)) }
def mappedError: Except(String, Nat) := { Except.map(String, Nat, Nat, inc, Except.error(String, Nat, "bad")) }
def mappedOkBool: Except(String, Bool) := { Except.map(String, Nat, Bool, isZero, Except.ok(String, Nat, 0)) }

theorem mapped_some_rfl: mappedSome = Option.some(Nat, 3) := by rfl
theorem mapped_none_rfl: mappedNone = Option.none(Nat) := by rfl
theorem mapped_bool_rfl: mappedBool = Option.some(Bool, true) := by rfl
theorem mapped_ok_rfl: mappedOk = Except.ok(String, Nat, 5) := by rfl
theorem mapped_error_rfl: mappedError = Except.error(String, Nat, "bad") := by rfl
theorem mapped_ok_bool_rfl: mappedOkBool = Except.ok(String, Bool, true) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-map.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'mappedSome'), 'Option.map results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.mappedSome.__psInductive, 'Option');
assert.equal(jsModule.mappedSome.__psCtor, 1);
assert.deepEqual(jsModule.mappedSome.fields, [3n]);
assert.equal(jsModule.mappedNone.__psInductive, 'Option');
assert.equal(jsModule.mappedNone.__psCtor, 0);
assert.equal(jsModule.mappedBool.__psCtor, 1);
assert.deepEqual(jsModule.mappedBool.fields, [true]);
assert.equal(jsModule.mappedOk.__psInductive, 'Except');
assert.equal(jsModule.mappedOk.__psCtor, 1);
assert.deepEqual(jsModule.mappedOk.fields, [5n]);
assert.equal(jsModule.mappedError.__psInductive, 'Except');
assert.equal(jsModule.mappedError.__psCtor, 0);
assert.deepEqual(jsModule.mappedError.fields, ['bad']);
assert.equal(jsModule.mappedOkBool.__psCtor, 1);
assert.deepEqual(jsModule.mappedOkBool.fields, [true]);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-map.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_map/, 'TypeScript emission should route through checked Option.map helper');
assert.match(tsSource, /Except_map/, 'TypeScript emission should route through checked Except.map helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(compiled.mappedSome.fields, [3n]);
assert.deepEqual(compiled.mappedOk.fields, [5n]);
assert.deepEqual(compiled.mappedError.fields, ['bad']);

const badOptionMapFunction = createPsliveFixture('proofscript-option-map-bad-function-', {
  fileName: 'BadOptionMapFunction.ps',
  source: `
function boolId(b: Bool): Bool := { b }
def bad: Option(Nat) := { Option.map(Nat, Nat, boolId, Option.some(Nat, 1)) }
`,
});
const rejectedOptionFunction = expectPsliveRejected(['check', badOptionMapFunction.source, '--json']);
assert.match(rejectedOptionFunction.message, /type mismatch|expected Pi-domain type|wrong type|Bool|Nat/i);

const badExceptMapResult = createPsliveFixture('proofscript-except-map-bad-result-', {
  fileName: 'BadExceptMapResult.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Except(String, Nat) := { Except.map(String, Nat, Bool, isZero, Except.ok(String, Nat, 0)) }
`,
});
const rejectedExceptResult = expectPsliveRejected(['check', badExceptMapResult.source, '--json']);
assert.match(rejectedExceptResult.message, /type mismatch|expected|Except|Bool|Nat/i);

console.log('PSLIVE_OPTION_EXCEPT_MAP=PASS');
