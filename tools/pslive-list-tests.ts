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

const fixture = createPsliveFixture('proofscript-list-', {
  fileName: 'List.ps',
  source: `
def emptyNatList: List(Nat) := { List.nil(Nat) }
def oneTwoThree: List(Nat) := {
  List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat))))
}

function lengthNat(xs: List(Nat)): Nat := {
  match (xs) {
    | List.nil => 0
    | List.cons head tail => Nat.succ(lengthNat(tail))
  }
}

function sumNat(xs: List(Nat)): Nat := {
  match (xs) {
    | List.nil => 0
    | List.cons head tail => head + sumNat(tail)
  }
}

def lenEmpty: Nat := { lengthNat(emptyNatList) }
def lenOneTwoThree: Nat := { lengthNat(oneTwoThree) }
def sumOneTwoThree: Nat := { sumNat(oneTwoThree) }

theorem len_empty_rfl: lenEmpty = 0 := by rfl
theorem len_one_two_three_rfl: lenOneTwoThree = 3 := by rfl
theorem sum_one_two_three_rfl: sumOneTwoThree = 6 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'lenOneTwoThree'), 'List length result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.lenEmpty, 0n);
assert.equal(jsModule.lenOneTwoThree, 3n);
assert.equal(jsModule.sumOneTwoThree, 6n);
assert.equal(jsModule.emptyNatList.__psInductive, 'List');
assert.equal(jsModule.oneTwoThree.__psInductive, 'List');
assert.equal(jsModule.oneTwoThree.__psCtor, 1);
assert.equal(jsModule.oneTwoThree.fields[0], 1n);

const { outPath: tsOut } = buildTsFixture(fixture, 'list.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Struct_mk\("List", 0, \[\]\)/, 'List.nil should erase type parameter and emit a zero-field constructor');
assert.match(tsSource, /Struct_mk\("List", 1, \[1n, /, 'List.cons should erase type parameter and emit head/tail fields');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.lenOneTwoThree, 3n);
assert.equal(compiled.sumOneTwoThree, 6n);

const badNonExhaustive = createPsliveFixture('proofscript-list-bad-non-exhaustive-', {
  fileName: 'BadNonExhaustiveList.ps',
  source: `
function bad(xs: List(Nat)): Nat := {
  match (xs) {
    | List.cons head tail => head
  }
}
`,
});
const nonExhaustive = expectPsliveRejected(['check', badNonExhaustive.source, '--json']);
assert.match(nonExhaustive.message, /non-exhaustive/i);

const badPayload = createPsliveFixture('proofscript-list-bad-payload-', {
  fileName: 'BadListPayload.ps',
  source: `
def bad: List(Nat) := { List.cons(Nat, true, List.nil(Nat)) }
`,
});
const wrongPayload = expectPsliveRejected(['check', badPayload.source, '--json']);
assert.match(wrongPayload.message, /wrong type|expected Pi-domain type|argument|Bool/i);

console.log('PSLIVE_LIST=PASS');
