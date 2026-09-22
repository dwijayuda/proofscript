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

const fixture = createPsliveFixture('proofscript-option-except-getd-', {
  fileName: 'OptionExceptGetD.ps',
  source: `
def optSomeDefault: Nat := { Option.getD(Nat, Option.some(Nat, 7), 99) }
def optNoneDefault: Nat := { Option.getD(Nat, Option.none(Nat), 99) }

def exceptOkDefault: Nat := { Except.getD(String, Nat, Except.ok(String, Nat, 4), 99) }
def exceptErrorDefault: Nat := { Except.getD(String, Nat, Except.error(String, Nat, "bad"), 99) }

theorem opt_some_default_rfl: optSomeDefault = 7 := by rfl
theorem opt_none_default_rfl: optNoneDefault = 99 := by rfl
theorem except_ok_default_rfl: exceptOkDefault = 4 := by rfl
theorem except_error_default_rfl: exceptErrorDefault = 99 := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'option-except-getd.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'optSomeDefault'), 'Option.getD results must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'exceptErrorDefault'), 'Except.getD results must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.optSomeDefault, 7n);
assert.equal(jsModule.optNoneDefault, 99n);
assert.equal(jsModule.exceptOkDefault, 4n);
assert.equal(jsModule.exceptErrorDefault, 99n);

const { outPath: tsOut } = buildTsFixture(fixture, 'option-except-getd.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Option_getD/, 'TypeScript emission should route Option.getD through checked runtime helper');
assert.match(tsSource, /Except_getD/, 'TypeScript emission should route Except.getD through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.optSomeDefault, 7n);
assert.equal(compiled.optNoneDefault, 99n);
assert.equal(compiled.exceptOkDefault, 4n);
assert.equal(compiled.exceptErrorDefault, 99n);

const badOptionDefault = createPsliveFixture('proofscript-option-getd-bad-default-', {
  fileName: 'BadOptionGetDDefault.ps',
  source: `
def bad: Nat := { Option.getD(Nat, Option.some(Nat, 1), true) }
`,
});
const rejectedOptionDefault = expectPsliveRejected(['check', badOptionDefault.source, '--json']);
assert.match(rejectedOptionDefault.message, /type mismatch|expected|Bool|Nat/i);

const badExceptInput = createPsliveFixture('proofscript-except-getd-bad-input-', {
  fileName: 'BadExceptGetDInput.ps',
  source: `
def bad: Nat := { Except.getD(String, Nat, Option.some(Nat, 1), 0) }
`,
});
const rejectedExceptInput = expectPsliveRejected(['check', badExceptInput.source, '--json']);
assert.match(rejectedExceptInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_OPTION_EXCEPT_GETD=PASS');
