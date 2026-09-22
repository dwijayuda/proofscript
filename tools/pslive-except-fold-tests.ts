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

const fixture = createPsliveFixture('proofscript-except-fold-', {
  fileName: 'ExceptFold.ps',
  source: `
function errorString(e: String): String := { e }
function okString(x: Nat): String := { "ok" }
function okSucc(x: Nat): Nat := { x + 1 }
function errorZero(e: String): Nat := { 0 }

def foldedErrorString: String := {
  Except.fold(String, Nat, String, errorString, okString, Except.error(String, Nat, "bad"))
}

def foldedOkString: String := {
  Except.fold(String, Nat, String, errorString, okString, Except.ok(String, Nat, 7))
}

def foldedErrorNat: Nat := {
  Except.fold(String, Nat, Nat, errorZero, okSucc, Except.error(String, Nat, "bad"))
}

def foldedOkNat: Nat := {
  Except.fold(String, Nat, Nat, errorZero, okSucc, Except.ok(String, Nat, 7))
}

theorem folded_error_string_rfl: foldedErrorString = "bad" := by rfl
theorem folded_ok_string_rfl: foldedOkString = "ok" := by rfl
theorem folded_error_nat_rfl: foldedErrorNat = 0 := by rfl
theorem folded_ok_nat_rfl: foldedOkNat = 8 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-fold.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedErrorString'), 'Except.fold error String result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedOkString'), 'Except.fold ok String result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedErrorNat'), 'Except.fold error Nat result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'foldedOkNat'), 'Except.fold ok Nat result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.foldedErrorString, 'bad');
assert.equal(jsModule.foldedOkString, 'ok');
assert.equal(jsModule.foldedErrorNat, 0n);
assert.equal(jsModule.foldedOkNat, 8n);

const { outPath: tsOut } = buildTsFixture(fixture, 'except-fold.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_fold/, 'TypeScript emission should route Except.fold through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.foldedErrorString, 'bad');
assert.equal(compiled.foldedOkString, 'ok');
assert.equal(compiled.foldedErrorNat, 0n);
assert.equal(compiled.foldedOkNat, 8n);

const badErrorFunction = createPsliveFixture('proofscript-except-fold-bad-error-function-', {
  fileName: 'BadExceptFoldErrorFunction.ps',
  source: `
function wrongError(n: Nat): String := { "bad" }
function okString(x: Nat): String := { "ok" }
def bad: String := { Except.fold(String, Nat, String, wrongError, okString, Except.error(String, Nat, "bad")) }
`,
});
const rejectedErrorFunction = expectPsliveRejected(['check', badErrorFunction.source, '--json']);
assert.match(rejectedErrorFunction.message, /type mismatch|expected Pi-domain type|String|Nat/i);

const badOkFunction = createPsliveFixture('proofscript-except-fold-bad-ok-function-', {
  fileName: 'BadExceptFoldOkFunction.ps',
  source: `
function errorString(e: String): String := { e }
function wrongOk(x: Bool): String := { "ok" }
def bad: String := { Except.fold(String, Nat, String, errorString, wrongOk, Except.ok(String, Nat, 7)) }
`,
});
const rejectedOkFunction = expectPsliveRejected(['check', badOkFunction.source, '--json']);
assert.match(rejectedOkFunction.message, /type mismatch|expected Pi-domain type|Bool|Nat/i);

const badValue = createPsliveFixture('proofscript-except-fold-bad-value-', {
  fileName: 'BadExceptFoldValue.ps',
  source: `
function errorString(e: String): String := { e }
function okString(x: Nat): String := { "ok" }
def bad: String := { Except.fold(String, Nat, String, errorString, okString, Option.some(Nat, 1)) }
`,
});
const rejectedValue = expectPsliveRejected(['check', badValue.source, '--json']);
assert.match(rejectedValue.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_EXCEPT_FOLD=PASS');
