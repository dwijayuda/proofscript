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

const fixture = createPsliveFixture('proofscript-array-map-', {
  fileName: 'ArrayMap.ps',
  source: `
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def xs: Array(Nat) := { [1, 2, 3] }
def mappedInc: Array(Nat) := { Array.map(Nat, Nat, inc, xs) }
def mappedBool: Array(Bool) := { Array.map(Nat, Bool, isZero, [0, 1]) }
def mappedEmpty: Array(Nat) := { Array.map(Nat, Nat, inc, []) }

theorem mapped_inc_rfl: mappedInc = [2, 3, 4] := by rfl
theorem mapped_bool_rfl: mappedBool = [true, false] := by rfl
theorem mapped_empty_rfl: mappedEmpty = [] := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'array-map.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'mappedInc'), 'Array.map result must be emitted');
const jsModule = requireFixtureModule(jsOut);
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
assert.equal(jsModule.mappedInc.__psInductive, 'Array');
assert.equal(jsModule.mappedInc.__psCtor, 0);
assert.deepEqual(listToArray(jsModule.mappedInc.fields[0]), [2n, 3n, 4n]);
assert.deepEqual(listToArray(jsModule.mappedBool.fields[0]), [true, false]);
assert.deepEqual(listToArray(jsModule.mappedEmpty.fields[0]), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'array-map.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Array_map/, 'TypeScript emission should route through the checked Array.map runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.mappedInc.fields[0]), [2n, 3n, 4n]);
assert.deepEqual(listToArray(compiled.mappedBool.fields[0]), [true, false]);

const badFunction = createPsliveFixture('proofscript-array-map-bad-function-', {
  fileName: 'BadArrayMapFunction.ps',
  source: `
function boolId(b: Bool): Bool := { b }
def bad: Array(Nat) := { Array.map(Nat, Nat, boolId, [1]) }
`,
});
const rejectedFunction = expectPsliveRejected(['check', badFunction.source, '--json']);
assert.match(rejectedFunction.message, /type mismatch|expected|Bool|Nat|function/i);

const badResult = createPsliveFixture('proofscript-array-map-bad-result-', {
  fileName: 'BadArrayMapResult.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: Array(Nat) := { Array.map(Nat, Bool, isZero, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Array|Bool|Nat/i);

console.log('PSLIVE_ARRAY_MAP=PASS');
