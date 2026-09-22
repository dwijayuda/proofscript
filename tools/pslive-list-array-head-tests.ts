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

const fixture = createPsliveFixture('proofscript-list-array-head-', {
  fileName: 'ListArrayHead.ps',
  source: `
def xs: List(Nat) := { List.cons(Nat, 7, List.cons(Nat, 2, List.nil(Nat))) }
def emptyList: List(Nat) := { List.nil(Nat) }

def listHead: Option(Nat) := { List.head?(Nat, xs) }
def listHeadEmpty: Option(Nat) := { List.head?(Nat, emptyList) }

def arr: Array(Nat) := { [7, 2] }
def arrEmpty: Array(Nat) := { [] }

def arrayHead: Option(Nat) := { Array.head?(Nat, arr) }
def arrayHeadEmpty: Option(Nat) := { Array.head?(Nat, arrEmpty) }

theorem list_head_rfl: listHead = Option.some(Nat, 7) := by rfl
theorem list_head_empty_rfl: listHeadEmpty = Option.none(Nat) := by rfl
theorem array_head_rfl: arrayHead = Option.some(Nat, 7) := by rfl
theorem array_head_empty_rfl: arrayHeadEmpty = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'list-array-head.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'listHead'), 'List.head? result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'arrayHead'), 'Array.head? result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.listHead.__psInductive, 'Option');
assert.equal(jsModule.listHead.__psCtor, 1);
assert.deepEqual(jsModule.listHead.fields, [7n]);
assert.equal(jsModule.listHeadEmpty.__psCtor, 0);
assert.equal(jsModule.arrayHead.__psInductive, 'Option');
assert.equal(jsModule.arrayHead.__psCtor, 1);
assert.deepEqual(jsModule.arrayHead.fields, [7n]);
assert.equal(jsModule.arrayHeadEmpty.__psCtor, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'list-array-head.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /List_headOpt/, 'TypeScript emission should route List.head? through the checked runtime helper');
assert.match(tsSource, /Array_headOpt/, 'TypeScript emission should route Array.head? through the checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.listHead.__psCtor, 1);
assert.deepEqual(compiled.listHead.fields, [7n]);
assert.equal(compiled.listHeadEmpty.__psCtor, 0);
assert.equal(compiled.arrayHead.__psCtor, 1);
assert.deepEqual(compiled.arrayHead.fields, [7n]);
assert.equal(compiled.arrayHeadEmpty.__psCtor, 0);

const badListHead = createPsliveFixture('proofscript-list-head-bad-array-', {
  fileName: 'BadListHeadArray.ps',
  source: `
def bad: Option(Nat) := { List.head?(Nat, [1, 2]) }
`,
});
const rejectedListHead = expectPsliveRejected(['check', badListHead.source, '--json']);
assert.match(rejectedListHead.message, /type mismatch|expected|List|Array/i);

const badArrayHead = createPsliveFixture('proofscript-array-head-bad-list-', {
  fileName: 'BadArrayHeadList.ps',
  source: `
def bad: Option(Nat) := { Array.head?(Nat, List.nil(Nat)) }
`,
});
const rejectedArrayHead = expectPsliveRejected(['check', badArrayHead.source, '--json']);
assert.match(rejectedArrayHead.message, /type mismatch|expected|Array|List/i);

const badResult = createPsliveFixture('proofscript-array-head-bad-result-', {
  fileName: 'BadArrayHeadResult.ps',
  source: `
def bad: Nat := { Array.head?(Nat, [0]) }
`,
});
const rejectedResult = expectPsliveRejected(['check', badResult.source, '--json']);
assert.match(rejectedResult.message, /type mismatch|expected|Option|Nat/i);

console.log('PSLIVE_LIST_ARRAY_HEAD=PASS');
