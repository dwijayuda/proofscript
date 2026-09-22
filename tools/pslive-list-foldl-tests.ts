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

const fixture = createPsliveFixture('proofscript-list-foldl-', {
  fileName: 'ListFoldl.ps',
  source: `
function addStep(acc: Nat, x: Nat): Nat := { acc + x }
function countStep(acc: Nat, x: Nat): Nat := { acc + 1 }
function parityStep(acc: Bool, x: Nat): Bool := { Bool.xor(acc, x == 0) }


def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat)))) }
def empty: List(Nat) := { List.nil(Nat) }

def sumXs: Nat := { List.foldl(Nat, Nat, addStep, 0, xs) }
def countXs: Nat := { List.foldl(Nat, Nat, countStep, 0, xs) }
def foldedEmpty: Nat := { List.foldl(Nat, Nat, addStep, 10, empty) }
def foldedBool: Bool := { List.foldl(Nat, Bool, parityStep, false, List.cons(Nat, 0, List.cons(Nat, 1, List.nil(Nat)))) }

theorem sum_xs_rfl: sumXs = 6 := by rfl
theorem count_xs_rfl: countXs = 3 := by rfl
theorem folded_empty_rfl: foldedEmpty = 10 := by rfl
theorem folded_bool_rfl: foldedBool = true := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-foldl.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'sumXs'), 'List.foldl result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.sumXs, 6n);
assert.equal(jsModule.countXs, 3n);
assert.equal(jsModule.foldedEmpty, 10n);
assert.equal(jsModule.foldedBool, true);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-foldl.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_foldl/, 'TypeScript emission should route through the checked List.foldl runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.sumXs, 6n);
assert.equal(compiled.countXs, 3n);
assert.equal(compiled.foldedEmpty, 10n);
assert.equal(compiled.foldedBool, true);

const badFunction = createPsliveFixture('proofscript-list-foldl-bad-function-', {
  fileName: 'BadListFoldlFunction.ps',
  source: `
function boolId(b: Bool): Bool := { b }
def bad: Nat := { List.foldl(Nat, Nat, boolId, 0, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedFunction = expectPsliveRejected(['check', badFunction.source, '--json']);
assert.match(rejectedFunction.message, /type mismatch|expected|Bool|Nat|function/i);

const badAccumulator = createPsliveFixture('proofscript-list-foldl-bad-accumulator-', {
  fileName: 'BadListFoldlAccumulator.ps',
  source: `
function addStep(acc: Nat, x: Nat): Nat := { acc + x }
def bad: Nat := { List.foldl(Nat, Nat, addStep, true, List.nil(Nat)) }
`,
});
const rejectedAccumulator = expectPsliveRejected(['check', badAccumulator.source, '--json']);
assert.match(rejectedAccumulator.message, /type mismatch|expected|Bool|Nat/i);

console.log('PSLIVE_LIST_FOLDL=PASS');
