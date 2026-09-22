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

const fixture = createPsliveFixture('proofscript-except-geterrord-', {
  fileName: 'ExceptGetErrorD.ps',
  source: `
def fromError: String := {
  Except.getErrorD(String, Nat, Except.error(String, Nat, "bad"), "fallback")
}

def fromOk: String := {
  Except.getErrorD(String, Nat, Except.ok(String, Nat, 7), "fallback")
}

theorem from_error_rfl: fromError = "bad" := by rfl
theorem from_ok_rfl: fromOk = "fallback" := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-geterrord.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'fromError'), 'Except.getErrorD error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'fromOk'), 'Except.getErrorD ok result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.fromError, 'bad');
assert.equal(jsModule.fromOk, 'fallback');

const { outPath: tsOut } = buildTsFixture(fixture, 'except-geterrord.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_getErrorD/, 'TypeScript emission should route Except.getErrorD through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.fromError, 'bad');
assert.equal(compiled.fromOk, 'fallback');

const badFallback = createPsliveFixture('proofscript-except-geterrord-bad-fallback-', {
  fileName: 'BadExceptGetErrorDFallback.ps',
  source: `
def bad: String := { Except.getErrorD(String, Nat, Except.ok(String, Nat, 1), 0) }
`,
});
const rejectedFallback = expectPsliveRejected(['check', badFallback.source, '--json']);
assert.match(rejectedFallback.message, /type mismatch|expected|String|Nat/i);

const badInput = createPsliveFixture('proofscript-except-geterrord-bad-input-', {
  fileName: 'BadExceptGetErrorDInput.ps',
  source: `
def bad: String := { Except.getErrorD(String, Nat, Option.some(Nat, 1), "fallback") }
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_EXCEPT_GETERRORD=PASS');
