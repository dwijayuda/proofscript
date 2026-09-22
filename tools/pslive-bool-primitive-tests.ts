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

const fixture = createPsliveFixture('proofscript-bool-primitive-', {
  fileName: 'BoolPrimitive.ps',
  source: `
def notTrue: Bool := { !true }
def notFalse: Bool := { Bool.not(false) }
def xorTrueFalse: Bool := { Bool.xor true false }
def xorTrueTrue: Bool := { Bool.xor true true }
def xorFalseFalse: Bool := { Bool.xor false false }
def nestedLogic: Bool := { !(3 < 2) && Bool.xor (2 == 2) false }
def chooseByNot: Nat := { if !false then 11 else 22 }
def chooseByXor: Nat := { if Bool.xor (1 < 2) (2 < 3) then 1 else 0 }
theorem not_true_rfl: notTrue = false := by rfl
theorem not_false_rfl: notFalse = true := by rfl
theorem xor_true_false_rfl: xorTrueFalse = true := by rfl
theorem xor_true_true_rfl: xorTrueTrue = false := by rfl
theorem choose_by_not_rfl: chooseByNot = 11 := by rfl
theorem choose_by_xor_rfl: chooseByXor = 0 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'bool-primitive.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'chooseByNot'), 'Bool primitive declarations must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.notTrue, false);
assert.equal(jsModule.notFalse, true);
assert.equal(jsModule.xorTrueFalse, true);
assert.equal(jsModule.xorTrueTrue, false);
assert.equal(jsModule.xorFalseFalse, false);
assert.equal(jsModule.nestedLogic, true);
assert.equal(jsModule.chooseByNot, 11n);
assert.equal(jsModule.chooseByXor, 0n);

const { outPath: tsOut } = buildTsFixture(fixture, 'bool-primitive.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Bool_not\(true\)/, 'generated TS should lower !true to checked Bool.not runtime semantics');
assert.match(tsSource, /Bool_xor\(true\)\(false\)/, 'generated TS should lower Bool.xor true false to checked Bool.xor runtime semantics');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.notTrue, false);
assert.equal(compiled.xorTrueFalse, true);
assert.equal(compiled.chooseByNot, 11n);

const badBang = createPsliveFixture('proofscript-bool-primitive-bad-', {
  fileName: 'BangOnlyRejected.ps',
  source: `def bad: Bool := { ! }
`,
});
const rejected = expectPsliveRejected(['check', badBang.source, '--json']);
assert.match(rejected.message, /prefix ! expects a following expression/i);

console.log('PSLIVE_BOOL_PRIMITIVE=PASS');
