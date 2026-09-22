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

const fixture = createPsliveFixture('proofscript-array-access-', {
  fileName: 'ArrayAccess.ps',
  source: `
def xs: Array(Nat) := { [1, 2, 3] }
def empty: Array(Nat) := { [] }

def xsSize: Nat := { Array.size(Nat, xs) }
def emptySize: Nat := { Array.size(Nat, empty) }
def first: Option(Nat) := { Array.get?(Nat, xs, 0) }
def second: Option(Nat) := { Array.get?(Nat, xs, 1) }
def missing: Option(Nat) := { Array.get?(Nat, xs, 3) }

theorem xs_size_rfl: xsSize = 3 := by rfl
theorem empty_size_rfl: emptySize = 0 := by rfl
theorem first_rfl: first = Option.some(Nat, 1) := by rfl
theorem missing_rfl: missing = Option.none(Nat) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'array-access.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'xsSize'), 'Array.size result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.xsSize, 3n);
assert.equal(jsModule.emptySize, 0n);
assert.equal(jsModule.first.__psInductive, 'Option');
assert.equal(jsModule.first.__psCtor, 1);
assert.equal(jsModule.first.fields[0], 1n);
assert.equal(jsModule.second.fields[0], 2n);
assert.equal(jsModule.missing.__psInductive, 'Option');
assert.equal(jsModule.missing.__psCtor, 0);

const { outPath: tsOut } = buildTsFixture(fixture, 'array-access.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Array_size/, 'TypeScript emission should use the checked Array.size runtime helper');
assert.match(tsSource, /Array_getOpt/, 'TypeScript emission should use the checked Array.get? runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.xsSize, 3n);
assert.equal(compiled.first.fields[0], 1n);

const badIndexType = createPsliveFixture('proofscript-array-get-bad-index-', {
  fileName: 'BadArrayGetIndex.ps',
  source: `
def xs: Array(Nat) := { [1, 2, 3] }
def bad: Option(Nat) := { Array.get?(Nat, xs, "0") }
`,
});
const rejectedIndex = expectPsliveRejected(['check', badIndexType.source, '--json']);
assert.match(rejectedIndex.message, /type mismatch|expected Nat|String/i);

const badArrayType = createPsliveFixture('proofscript-array-size-bad-array-', {
  fileName: 'BadArraySize.ps',
  source: `
def bad: Nat := { Array.size(Nat, 3) }
`,
});
const rejectedArray = expectPsliveRejected(['check', badArrayType.source, '--json']);
assert.match(rejectedArray.message, /type mismatch|expected Array|expected type Nat|literal only at expected type Nat/i);

console.log('PSLIVE_ARRAY_ACCESS=PASS');
