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

const fixture = createPsliveFixture('proofscript-option-filter-', {
  fileName: 'OptionFilter.ps',
  source: `
function small(x: Nat): Bool := { Nat.ltb(x, 4) }
function idNat(x: Nat): Nat := { x }

def kept: Option(Nat) := { Option.filter(Nat, small, Option.some(Nat, 2)) }
def dropped: Option(Nat) := { Option.filter(Nat, small, Option.some(Nat, 7)) }
def empty: Option(Nat) := { Option.filter(Nat, small, Option.none(Nat)) }

theorem kept_rfl: kept = Option.some(Nat, 2) := by rfl
theorem dropped_rfl: dropped = Option.none(Nat) := by rfl
theorem empty_rfl: empty = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-filter.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'kept'), 'Option.filter kept result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'dropped'), 'Option.filter dropped result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertOption(jsModule.kept, 1, 2n);
assertOption(jsModule.dropped, 0);
assertOption(jsModule.empty, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-filter.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_filter/, 'TypeScript emission should route Option.filter through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertOption(compiled.kept, 1, 2n);
assertOption(compiled.dropped, 0);
assertOption(compiled.empty, 0);

const badPredicate = createPsliveFixture('proofscript-option-filter-bad-predicate-', {
  fileName: 'BadOptionFilterPredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: Option(Nat) := { Option.filter(Nat, idNat, Option.some(Nat, 1)) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badInput = createPsliveFixture('proofscript-option-filter-bad-input-', {
  fileName: 'BadOptionFilterInput.ps',
  source: `
function small(x: Nat): Bool := { Nat.ltb(x, 4) }
def bad: Option(Nat) := { Option.filter(Nat, small, Except.ok(String, Nat, 1)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Option|Except/i);

console.log('PSLIVE_OPTION_FILTER=PASS');
