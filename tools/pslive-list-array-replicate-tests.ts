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

const fixture = createPsliveFixture('proofscript-list-array-replicate-', {
  fileName: 'ListArrayReplicate.ps',
  source: `
def repeatedEmpty: List(Nat) := { List.replicate(Nat, 0, 7) }
def repeatedThree: List(Nat) := { List.replicate(Nat, 3, 7) }

def arrRepeatedEmpty: Array(Nat) := { Array.replicate(Nat, 0, 7) }
def arrRepeatedThree: Array(Nat) := { Array.replicate(Nat, 3, 7) }

theorem list_replicate_empty_rfl: repeatedEmpty = List.nil(Nat) := by rfl
theorem list_replicate_three_rfl: repeatedThree = List.cons(Nat, 7, List.cons(Nat, 7, List.cons(Nat, 7, List.nil(Nat)))) := by rfl
theorem array_replicate_empty_rfl: arrRepeatedEmpty = Array.mk(Nat, List.nil(Nat)) := by rfl
theorem array_replicate_three_rfl: arrRepeatedThree = Array.mk(Nat, List.cons(Nat, 7, List.cons(Nat, 7, List.cons(Nat, 7, List.nil(Nat))))) := by rfl
`,
});

function listToArray(list: any): bigint[] {
  const out: bigint[] = [];
  let cursor = list;
  for (let depth = 0; depth < 32; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    assert.equal(cursor.fields.length, 2);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('test List payload exceeded finite depth');
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-replicate.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'repeatedThree'), 'List.replicate result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrRepeatedThree'), 'Array.replicate result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.repeatedEmpty), []);
assert.deepEqual(listToArray(jsModule.repeatedThree), [7n, 7n, 7n]);
assert.equal(jsModule.arrRepeatedEmpty.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.arrRepeatedEmpty.fields[0]), []);
assert.deepEqual(listToArray(jsModule.arrRepeatedThree.fields[0]), [7n, 7n, 7n]);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-replicate.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_replicate/, 'TypeScript emission should route List.replicate through the checked runtime helper');
assert.match(tsSource, /Array_replicate/, 'TypeScript emission should route Array.replicate through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.repeatedThree), [7n, 7n, 7n]);
assert.deepEqual(listToArray(compiled.arrRepeatedThree.fields[0]), [7n, 7n, 7n]);

const badCount = createPsliveFixture('proofscript-list-replicate-bad-count-', {
  fileName: 'BadListReplicateCount.ps',
  source: `
def bad: List(Nat) := { List.replicate(Nat, "3", 7) }
`,
});
const rejectedCount = expectPsliveRejected(['check', badCount.source, '--json']);
assert.match(rejectedCount.message, /type mismatch|expected Nat|String/i);

const badValue = createPsliveFixture('proofscript-list-replicate-bad-value-', {
  fileName: 'BadListReplicateValue.ps',
  source: `
def bad: List(Nat) := { List.replicate(Nat, 2, "7") }
`,
});
const rejectedValue = expectPsliveRejected(['check', badValue.source, '--json']);
assert.match(rejectedValue.message, /type mismatch|expected Nat|String/i);

const badResult = createPsliveFixture('proofscript-array-replicate-bad-result-', {
  fileName: 'BadArrayReplicateResult.ps',
  source: `
def bad: List(Nat) := { Array.replicate(Nat, 3, 7) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Array|List/i);

console.log('PSLIVE_LIST_ARRAY_REPLICATE=PASS');
