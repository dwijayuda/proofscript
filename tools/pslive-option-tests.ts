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

const fixture = createPsliveFixture('proofscript-option-', {
  fileName: 'Option.ps',
  source: `
def noneNat: Option(Nat) := { Option.none(Nat) }
def someNat: Option(Nat) := { Option.some(Nat, 7) }

function optionDefault(o: Option(Nat)): Nat := {
  match (o) {
    | Option.none => 0
    | Option.some value => value
  }
}

function optionIsSome(o: Option(Nat)): Bool := {
  match (o) {
    | Option.none => false
    | Option.some value => true
  }
}

def noneDefault: Nat := { optionDefault(noneNat) }
def someDefault: Nat := { optionDefault(someNat) }
def noneIsSome: Bool := { optionIsSome(noneNat) }
def someIsSome: Bool := { optionIsSome(someNat) }

theorem none_default_rfl: noneDefault = 0 := by rfl
theorem some_default_rfl: someDefault = 7 := by rfl
theorem none_is_some_rfl: noneIsSome = false := by rfl
theorem some_is_some_rfl: someIsSome = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'noneDefault'), 'Option defaults must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.noneDefault, 0n);
assert.equal(jsModule.someDefault, 7n);
assert.equal(jsModule.noneIsSome, false);
assert.equal(jsModule.someIsSome, true);
assert.equal(jsModule.noneNat.__psInductive, 'Option');
assert.equal(jsModule.someNat.__psInductive, 'Option');
assert.deepEqual(jsModule.someNat.fields, [7n]);

const { outPath: tsOut } = buildTsFixture(fixture, 'option.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Struct_mk\("Option", 0, \[\]\)/, 'Option.none should erase type parameter and emit a zero-field constructor');
assert.match(tsSource, /Struct_mk\("Option", 1, \[7n\]\)/, 'Option.some should erase type parameter and emit payload field');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.noneDefault, 0n);
assert.equal(compiled.someDefault, 7n);
assert.equal(compiled.someIsSome, true);

const badNonExhaustive = createPsliveFixture('proofscript-option-bad-non-exhaustive-', {
  fileName: 'BadNonExhaustiveOption.ps',
  source: `
function bad(o: Option(Nat)): Nat := {
  match (o) {
    | Option.some value => value
  }
}
`,
});
const nonExhaustive = expectPsliveRejected(['check', badNonExhaustive.source, '--json']);
assert.match(nonExhaustive.message, /non-exhaustive/i);

const badWrongPayload = createPsliveFixture('proofscript-option-bad-payload-', {
  fileName: 'BadOptionPayload.ps',
  source: `
def bad: Option(Nat) := { Option.some(Nat, true) }
`,
});
const wrongPayload = expectPsliveRejected(['check', badWrongPayload.source, '--json']);
assert.match(wrongPayload.message, /expected Pi-domain type|wrong type|argument|expected type Bool/i);

console.log('PSLIVE_OPTION=PASS');
