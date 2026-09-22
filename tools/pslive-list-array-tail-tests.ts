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

const fixture = createPsliveFixture('proofscript-list-array-tail-', {
  fileName: 'ListArrayTail.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) }
def singleton: List(Nat) := { List.cons(Nat, 7, List.nil(Nat)) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listTail: Option(List(Nat)) := { List.tail?(Nat, xs) }
def listTailSingleton: Option(List(Nat)) := { List.tail?(Nat, singleton) }
def listTailEmpty: Option(List(Nat)) := { List.tail?(Nat, emptyList) }

def arr: Array(Nat) := { [7, 2, 9] }
def arrSingleton: Array(Nat) := { [7] }
def arrEmpty: Array(Nat) := { [] }

def arrayTail: Option(Array(Nat)) := { Array.tail?(Nat, arr) }
def arrayTailSingleton: Option(Array(Nat)) := { Array.tail?(Nat, arrSingleton) }
def arrayTailEmpty: Option(Array(Nat)) := { Array.tail?(Nat, arrEmpty) }

theorem list_tail_rfl: listTail = Option.some(List(Nat), List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat)))) := by rfl
theorem list_tail_singleton_rfl: listTailSingleton = Option.some(List(Nat), List.nil(Nat)) := by rfl
theorem list_tail_empty_rfl: listTailEmpty = Option.none(List(Nat)) := by rfl
theorem array_tail_rfl: arrayTail = Option.some(Array(Nat), Array.mk(Nat, List.cons(Nat, 2, List.cons(Nat, 9, List.nil(Nat))))) := by rfl
theorem array_tail_singleton_rfl: arrayTailSingleton = Option.some(Array(Nat), Array.mk(Nat, List.nil(Nat))) := by rfl
theorem array_tail_empty_rfl: arrayTailEmpty = Option.none(Array(Nat)) := by rfl
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

function optionPayload(value: any): any | undefined {
  assert.equal(value.__psInductive, 'Option');
  if (value.__psCtor === 0) {
    assert.deepEqual(value.fields, []);
    return undefined;
  }
  assert.equal(value.__psCtor, 1);
  assert.equal(value.fields.length, 1);
  return value.fields[0];
}

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-tail.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listTail'), 'List.tail? result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayTail'), 'Array.tail? result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.deepEqual(listToArray(optionPayload(jsModule.listTail)), [2n, 9n]);
assert.deepEqual(listToArray(optionPayload(jsModule.listTailSingleton)), []);
assert.equal(optionPayload(jsModule.listTailEmpty), undefined);
const jsArrayTail = optionPayload(jsModule.arrayTail);
assert.equal(jsArrayTail.__psInductive, 'Array');
assert.deepEqual(listToArray(jsArrayTail.fields[0]), [2n, 9n]);
const jsArrayTailSingleton = optionPayload(jsModule.arrayTailSingleton);
assert.equal(jsArrayTailSingleton.__psInductive, 'Array');
assert.deepEqual(listToArray(jsArrayTailSingleton.fields[0]), []);
assert.equal(optionPayload(jsModule.arrayTailEmpty), undefined);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-tail.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_tailOpt/, 'TypeScript emission should route List.tail? through the checked runtime helper');
assert.match(tsSource, /Array_tailOpt/, 'TypeScript emission should route Array.tail? through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(listToArray(optionPayload(compiled.listTail)), [2n, 9n]);
assert.deepEqual(listToArray(optionPayload(compiled.listTailSingleton)), []);
assert.equal(optionPayload(compiled.listTailEmpty), undefined);
assert.deepEqual(listToArray(optionPayload(compiled.arrayTail).fields[0]), [2n, 9n]);
assert.deepEqual(listToArray(optionPayload(compiled.arrayTailSingleton).fields[0]), []);
assert.equal(optionPayload(compiled.arrayTailEmpty), undefined);

const badListTail = createPsliveFixture('proofscript-list-tail-bad-array-', {
  fileName: 'BadListTailArray.ps',
  source: `
def bad: Option(List(Nat)) := { List.tail?(Nat, [1, 2]) }
`,
});
const rejectedListTail = expectPsliveRejected(['check', badListTail.source, '--json']);
assert.match(rejectedListTail.message, /type mismatch|expected|List|Array/i);

const badArrayTail = createPsliveFixture('proofscript-array-tail-bad-list-', {
  fileName: 'BadArrayTailList.ps',
  source: `
def bad: Option(Array(Nat)) := { Array.tail?(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayTail = expectPsliveRejected(['check', badArrayTail.source, '--json']);
assert.match(rejectedArrayTail.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-array-tail-bad-result-', {
  fileName: 'BadArrayTailResult.ps',
  source: `
def bad: Array(Nat) := { Array.tail?(Nat, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|Array/i);

console.log('PSLIVE_LIST_ARRAY_TAIL=PASS');
