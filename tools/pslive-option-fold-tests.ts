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

const fixture = createPsliveFixture('proofscript-option-fold-', {
  fileName: 'OptionFold.ps',
  source: `
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def foldedSome: Nat := {
  Option.fold(Nat, Nat, 99, inc, Option.some(Nat, 2))
}

def foldedNone: Nat := {
  Option.fold(Nat, Nat, 99, inc, Option.none(Nat))
}

def foldedBool: Bool := {
  Option.fold(Nat, Bool, false, isZero, Option.some(Nat, 0))
}

theorem folded_some_rfl: foldedSome = 3 := by rfl
theorem folded_none_rfl: foldedNone = 99 := by rfl
theorem folded_bool_rfl: foldedBool = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-fold.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedSome'), 'Option.fold some result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedNone'), 'Option.fold none result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedBool'), 'Option.fold Bool result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.foldedSome, 3n);
assert.equal(jsModule.foldedNone, 99n);
assert.equal(jsModule.foldedBool, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-fold.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_fold/, 'TypeScript emission should route Option.fold through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.foldedSome, 3n);
assert.equal(compiled.foldedNone, 99n);
assert.equal(compiled.foldedBool, true);

const badFunction = createPsliveFixture('proofscript-option-fold-bad-function-', {
  fileName: 'BadOptionFoldFunction.ps',
  source: `
function boolId(b: Bool): Bool := { b }
def bad: Nat := { Option.fold(Nat, Nat, 0, boolId, Option.some(Nat, 1)) }
`,
});
const rejectedFunction = expectPsliveRejected(['check', badFunction.source, '--json']);
assert.match(rejectedFunction.message, /type mismatch|expected Pi-domain type|wrong type|Bool|Nat/i);

const badValue = createPsliveFixture('proofscript-option-fold-bad-value-', {
  fileName: 'BadOptionFoldValue.ps',
  source: `
function inc(x: Nat): Nat := { x + 1 }
def bad: Nat := { Option.fold(Nat, Nat, 0, inc, Except.ok(String, Nat, 1)) }
`,
});
const rejectedValue = expectPsliveRejected(['check', badValue.source, '--json']);
assert.match(rejectedValue.message, /type mismatch|expected|Option|Except/i);

console.log('PSLIVE_OPTION_FOLD=PASS');
