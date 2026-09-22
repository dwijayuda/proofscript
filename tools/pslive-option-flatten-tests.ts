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

function assertOption(value: any, expectedCtor: number, expectedValue?: bigint) {
  assert.equal(value.__psInductive, 'Option');
  assert.equal(value.__psCtor, expectedCtor);
  if (expectedCtor === 0) assert.equal(value.fields.length, 0);
  else {
    assert.equal(value.fields.length, 1);
    assert.equal(value.fields[0], expectedValue);
  }
}

const fixture = createPsliveFixture('proofscript-option-flatten-', {
  fileName: 'OptionFlatten.ps',
  source: `
def flattenedSome: Option(Nat) := {
  Option.flatten(Nat, Option.some(Option(Nat), Option.some(Nat, 5)))
}

def flattenedInnerNone: Option(Nat) := {
  Option.flatten(Nat, Option.some(Option(Nat), Option.none(Nat)))
}

def flattenedOuterNone: Option(Nat) := {
  Option.flatten(Nat, Option.none(Option(Nat)))
}

theorem flattened_some_rfl: flattenedSome = Option.some(Nat, 5) := by rfl
theorem flattened_inner_none_rfl: flattenedInnerNone = Option.none(Nat) := by rfl
theorem flattened_outer_none_rfl: flattenedOuterNone = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-flatten.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedSome'), 'Option.flatten some/some result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedInnerNone'), 'Option.flatten some/none result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'flattenedOuterNone'), 'Option.flatten none result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertOption(jsModule.flattenedSome, 1, 5n);
assertOption(jsModule.flattenedInnerNone, 0);
assertOption(jsModule.flattenedOuterNone, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-flatten.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_flatten/, 'TypeScript emission should route Option.flatten through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertOption(compiled.flattenedSome, 1, 5n);
assertOption(compiled.flattenedInnerNone, 0);
assertOption(compiled.flattenedOuterNone, 0);

const badInput = createPsliveFixture('proofscript-option-flatten-bad-input-', {
  fileName: 'BadOptionFlattenInput.ps',
  source: `
def bad: Option(Nat) := { Option.flatten(Nat, Option.some(Nat, 1)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Option/i);

console.log('PSLIVE_OPTION_FLATTEN=PASS');
