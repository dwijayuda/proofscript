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

const fixture = createPsliveFixture('proofscript-option-any-', {
  fileName: 'OptionAny.ps',
  source: `
def isSeven(x: Nat): Bool := { x == 7 }
def someSevenHasSeven: Bool := { Option.any(Nat, isSeven, Option.some(Nat, 7)) }
def someEightHasSeven: Bool := { Option.any(Nat, isSeven, Option.some(Nat, 8)) }
def noneHasSeven: Bool := { Option.any(Nat, isSeven, Option.none(Nat)) }

theorem some_seven_any_rfl: someSevenHasSeven = Bool.true := by rfl
theorem some_eight_any_rfl: someEightHasSeven = Bool.false := by rfl
theorem none_any_rfl: noneHasSeven = Bool.false := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-any.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'someSevenHasSeven'), 'Option.any positive result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'someEightHasSeven'), 'Option.any negative some result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'noneHasSeven'), 'Option.any none result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.someSevenHasSeven, true);
assert.equal(jsModule.someEightHasSeven, false);
assert.equal(jsModule.noneHasSeven, false);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-any.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_any/, 'TypeScript emission should route Option.any through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.someSevenHasSeven, true);
assert.equal(compiled.someEightHasSeven, false);
assert.equal(compiled.noneHasSeven, false);

const badPredicate = createPsliveFixture('proofscript-option-any-bad-predicate-', {
  fileName: 'BadOptionAnyPredicate.ps',
  source: `
def badPredicate(x: Nat): Nat := { x + 1 }
def bad: Bool := { Option.any(Nat, badPredicate, Option.some(Nat, 7)) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected Pi-codomain type|expected Pi-domain type|application argument/i);

const badInput = createPsliveFixture('proofscript-option-any-bad-input-', {
  fileName: 'BadOptionAnyInput.ps',
  source: `
def isSeven(x: Nat): Bool := { x == 7 }
def bad: Bool := { Option.any(Nat, isSeven, Except.ok(String, Nat, 7)) }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Option|Except/i);

console.log('PSLIVE_OPTION_ANY=PASS');
