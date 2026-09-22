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

const fixture = createPsliveFixture('proofscript-list-array-singleton-', {
  fileName: 'ListArraySingleton.ps',
  source: `
def oneList: List(Nat) := { List.singleton(Nat, 9) }
def oneArray: Array(Nat) := { Array.singleton(Nat, 9) }

theorem list_singleton_rfl: oneList = List.cons(Nat, 9, List.nil(Nat)) := by rfl
theorem array_singleton_rfl: oneArray = Array.mk(Nat, List.cons(Nat, 9, List.nil(Nat))) := by rfl
`,
});

function listToArray(list: any): bigint[] {
  const out: bigint[] = [];
  let cursor = list;
  for (let depth = 0; depth < 16; depth++) {
    assert.equal(cursor.__psInductive, 'List');
    if (cursor.__psCtor === 0) return out;
    assert.equal(cursor.__psCtor, 1);
    assert.equal(cursor.fields.length, 2);
    out.push(cursor.fields[0]);
    cursor = cursor.fields[1];
  }
  throw new Error('test List payload exceeded finite depth');
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-singleton.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'oneList'), 'List.singleton result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'oneArray'), 'Array.singleton result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(jsModule.oneList), [9n]);
assert.equal(jsModule.oneArray.__psInductive, 'Array');
assert.deepEqual(listToArray(jsModule.oneArray.fields[0]), [9n]);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-singleton.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_singleton/, 'TypeScript emission should route List.singleton through checked runtime helper');
assert.match(tsSource, /Array_singleton/, 'TypeScript emission should route Array.singleton through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(compiled.oneList), [9n]);
assert.deepEqual(listToArray(compiled.oneArray.fields[0]), [9n]);

const badValue = createPsliveFixture('proofscript-list-singleton-bad-value-', {
  fileName: 'BadListSingletonValue.ps',
  source: `
def bad: List(Nat) := { List.singleton(Nat, "9") }
`,
});
const rejectedValue = expectPsliveRejected(['check', badValue.source, '--json']);
assert.match(rejectedValue.message, /type mismatch|expected Nat|String/i);

const badResult = createPsliveFixture('proofscript-array-singleton-bad-result-', {
  fileName: 'BadArraySingletonResult.ps',
  source: `
def bad: List(Nat) := { Array.singleton(Nat, 9) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Array|List/i);

console.log('PSLIVE_LIST_ARRAY_SINGLETON=PASS');
