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

function listToArray(list) {
  const out = [];
  let cursor = list;
  for (let depth = 0; depth < 100000; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('bounded list traversal exceeded');
}

const fixture = createPsliveFixture('proofscript-list-array-filter-', {
  fileName: 'ListArrayFilter.ps',
  source: `
function keepZero(x: Nat): Bool := { x == 0 }
function keepNonZero(x: Nat): Bool := { Bool.not(x == 0) }


def xs: List(Nat) := { List.cons(Nat, 0, List.cons(Nat, 2, List.cons(Nat, 0, List.nil(Nat)))) }
def filteredZeros: List(Nat) := { List.filter(Nat, keepZero, xs) }
def filteredNonZeros: List(Nat) := { List.filter(Nat, keepNonZero, xs) }
def filteredEmpty: List(Nat) := { List.filter(Nat, keepZero, List.nil(Nat)) }

def arr: Array(Nat) := { [0, 2, 0] }
def arrayZeros: Array(Nat) := { Array.filter(Nat, keepZero, arr) }
def arrayNonZeros: Array(Nat) := { Array.filter(Nat, keepNonZero, arr) }
def arrayEmpty: Array(Nat) := { Array.filter(Nat, keepZero, []) }

theorem filtered_zeros_rfl: filteredZeros = List.cons(Nat, 0, List.cons(Nat, 0, List.nil(Nat))) := by rfl
theorem filtered_nonzeros_rfl: filteredNonZeros = List.cons(Nat, 2, List.nil(Nat)) := by rfl
theorem filtered_empty_rfl: filteredEmpty = List.nil(Nat) := by rfl
theorem array_zeros_rfl: arrayZeros = [0, 0] := by rfl
theorem array_nonzeros_rfl: arrayNonZeros = [2] := by rfl
theorem array_empty_rfl: arrayEmpty = [] := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-filter.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'filteredZeros'), 'List.filter result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.filteredZeros), [0n, 0n]);
assert.deepEqual(listToArray(jsModule.filteredNonZeros), [2n]);
assert.deepEqual(listToArray(jsModule.filteredEmpty), []);
assert.equal(jsModule.arrayZeros.__psInductive, 'Array');
assert.equal(jsModule.arrayZeros.__psCtor, 0);
assert.deepEqual(listToArray(jsModule.arrayZeros.fields[0]), [0n, 0n]);
assert.deepEqual(listToArray(jsModule.arrayNonZeros.fields[0]), [2n]);
assert.deepEqual(listToArray(jsModule.arrayEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-filter.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_filter/, 'TypeScript emission should route List.filter through the checked runtime helper');
assert.match(tsSource, /Array_filter/, 'TypeScript emission should route Array.filter through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.filteredZeros), [0n, 0n]);
assert.deepEqual(listToArray(compiled.arrayZeros.fields[0]), [0n, 0n]);

const badPredicate = createPsliveFixture('proofscript-list-filter-bad-predicate-', {
  fileName: 'BadListFilterPredicate.ps',
  source: `
function idNat(x: Nat): Nat := { x }
def bad: List(Nat) := { List.filter(Nat, idNat, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedPredicate = expectPsliveRejected(['check', badPredicate.source, '--json']);
assert.match(rejectedPredicate.message, /type mismatch|expected|Bool|Nat|function/i);

const badResult = createPsliveFixture('proofscript-array-filter-bad-result-', {
  fileName: 'BadArrayFilterResult.ps',
  source: `
function keepZero(x: Nat): Bool := { x == 0 }
def bad: Array(Bool) := { Array.filter(Nat, keepZero, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Array|Bool|Nat/i);

console.log('PSLIVE_LIST_ARRAY_FILTER=PASS');
