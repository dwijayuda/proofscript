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

const fixture = createPsliveFixture('proofscript-do-notation-', {
  fileName: 'DoNotation.ps',
  source: `
function someSucc(x: Nat): Option(Nat) := { Option.some(Nat, x + 1) }
function okSucc(x: Nat): Except(String, Nat) := { Except.ok(String, Nat, x + 1) }
function failWithBad(x: Nat): Except(String, Nat) := { Except.error(String, Nat, "bad") }

def optionDoSome: Option(Nat) := {
  do {
    x <- Option.some(Nat, 2);
    y <- someSucc(x);
    Option.some(Nat, y + 1)
  }
}

def optionDoNone: Option(Nat) := {
  do {
    x <- Option.none(Nat);
    Option.some(Nat, x + 1)
  }
}

def exceptDoOk: Except(String, Nat) := {
  do {
    x <- Except.ok(String, Nat, 4);
    y <- okSucc(x);
    Except.ok(String, Nat, y + 1)
  }
}

def exceptDoError: Except(String, Nat) := {
  do {
    x <- Except.error(String, Nat, "bad");
    Except.ok(String, Nat, x + 1)
  }
}

def exceptDoOkToError: Except(String, Nat) := {
  do {
    x <- Except.ok(String, Nat, 4);
    failWithBad(x)
  }
}

theorem option_do_some_rfl: optionDoSome = Option.some(Nat, 4) := by rfl
theorem option_do_none_rfl: optionDoNone = Option.none(Nat) := by rfl
theorem except_do_ok_rfl: exceptDoOk = Except.ok(String, Nat, 6) := by rfl
theorem except_do_error_rfl: exceptDoError = Except.error(String, Nat, "bad") := by rfl
theorem except_do_ok_to_error_rfl: exceptDoOkToError = Except.error(String, Nat, "bad") := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'do-notation.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optionDoSome'), 'do-notation results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.optionDoSome.__psInductive, 'Option');
assert.equal(jsModule.optionDoSome.__psCtor, 1);
assert.deepEqual(jsModule.optionDoSome.fields, [4n]);
assert.equal(jsModule.optionDoNone.__psInductive, 'Option');
assert.equal(jsModule.optionDoNone.__psCtor, 0);
assert.equal(jsModule.exceptDoOk.__psInductive, 'Except');
assert.equal(jsModule.exceptDoOk.__psCtor, 1);
assert.deepEqual(jsModule.exceptDoOk.fields, [6n]);
assert.equal(jsModule.exceptDoError.__psInductive, 'Except');
assert.equal(jsModule.exceptDoError.__psCtor, 0);
assert.deepEqual(jsModule.exceptDoError.fields, ['bad']);
assert.equal(jsModule.exceptDoOkToError.__psCtor, 0);
assert.deepEqual(jsModule.exceptDoOkToError.fields, ['bad']);

const { outPath: tsOut } = buildTsFixture(fixture, 'do-notation.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_bind/, 'TypeScript emission should lower Option do to checked Option.bind helper');
assert.match(tsSource, /Except_bind/, 'TypeScript emission should lower Except do to checked Except.bind helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.deepEqual(compiled.optionDoSome.fields, [4n]);
assert.equal(compiled.optionDoNone.__psCtor, 0);
assert.deepEqual(compiled.exceptDoOk.fields, [6n]);
assert.deepEqual(compiled.exceptDoError.fields, ['bad']);

const badNoExpected = createPsliveFixture('proofscript-do-bad-no-expected-', {
  fileName: 'BadDoNoExpected.ps',
  source: `
function idDo(x: Nat) := {
  do {
    y <- Option.some(Nat, x);
    Option.some(Nat, y)
  }
}
`,
});
const rejectedNoExpected = expectPsliveRejected(['check', badNoExpected.source, '--json']);
assert.match(rejectedNoExpected.message, /requires an expected Option\(A\) or Except\(E, A\) result type|explicit result type/i);

const badMixed = createPsliveFixture('proofscript-do-bad-mixed-', {
  fileName: 'BadDoMixed.ps',
  source: `
def badMixed: Option(Nat) := {
  do {
    x <- Except.ok(String, Nat, 1);
    Option.some(Nat, x)
  }
}
`,
});
const rejectedMixed = expectPsliveRejected(['check', badMixed.source, '--json']);
assert.match(rejectedMixed.message, /Option do-bind expects (?:a checked )?Option\(A\)|expected Option/i);

const badFinal = createPsliveFixture('proofscript-do-bad-final-', {
  fileName: 'BadDoFinal.ps',
  source: `
def badFinal: Option(Nat) := {
  do {
    x <- Option.some(Nat, 1);
    x + 1
  }
}
`,
});
const rejectedFinal = expectPsliveRejected(['check', badFinal.source, '--json']);
assert.match(rejectedFinal.message, /expected type|Option|Nat|wrong type|type mismatch/i);

console.log('PSLIVE_DO_NOTATION=PASS');
