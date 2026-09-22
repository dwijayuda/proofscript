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

const fixture = createPsliveFixture('proofscript-list-map-', {
  fileName: 'ListMap.ps',
  source: `
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) }
def mappedInc: List(Nat) := { List.map(Nat, Nat, inc, xs) }
def mappedBool: List(Bool) := { List.map(Nat, Bool, isZero, List.cons(Nat, 0, List.cons(Nat, 1, List.nil(Nat)))) }
def mappedEmpty: List(Nat) := { List.map(Nat, Nat, inc, List.nil(Nat)) }

theorem mapped_inc_rfl: mappedInc = List.cons(Nat, 2, List.cons(Nat, 3, List.nil(Nat))) := by rfl
theorem mapped_bool_rfl: mappedBool = List.cons(Bool, true, List.cons(Bool, false, List.nil(Bool))) := by rfl
theorem mapped_empty_rfl: mappedEmpty = List.nil(Nat) := by rfl
`,
});

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

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-map.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'mappedInc'), 'List.map result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.mappedInc), [2n, 3n]);
assert.deepEqual(listToArray(jsModule.mappedBool), [true, false]);
assert.deepEqual(listToArray(jsModule.mappedEmpty), []);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-map.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_map/, 'TypeScript emission should route through the checked List.map runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.mappedInc), [2n, 3n]);
assert.deepEqual(listToArray(compiled.mappedBool), [true, false]);

const badFunction = createPsliveFixture('proofscript-list-map-bad-function-', {
  fileName: 'BadListMapFunction.ps',
  source: `
function boolId(b: Bool): Bool := { b }
def bad: List(Nat) := { List.map(Nat, Nat, boolId, List.cons(Nat, 1, List.nil(Nat))) }
`,
});
const rejectedFunction = expectPsliveRejected(['check', badFunction.source, '--json']);
assert.match(rejectedFunction.message, /type mismatch|expected|Bool|Nat|function/i);

const badResult = createPsliveFixture('proofscript-list-map-bad-result-', {
  fileName: 'BadListMapResult.ps',
  source: `
function isZero(x: Nat): Bool := { x == 0 }
def bad: List(Nat) := { List.map(Nat, Bool, isZero, List.nil(Nat)) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|List|Bool|Nat/i);

console.log('PSLIVE_LIST_MAP=PASS');
