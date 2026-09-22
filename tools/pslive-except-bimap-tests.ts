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

function assertExcept(value: any, expectedCtor: number, expectedValue: string | bigint) {
  assert.equal(value.__psInductive, 'Except');
  assert.equal(value.__psCtor, expectedCtor);
  assert.equal(value.fields.length, 1);
  assert.equal(value.fields[0], expectedValue);
}

const fixture = createPsliveFixture('proofscript-except-bimap-', {
  fileName: 'ExceptBimap.ps',
  source: `
def mapErrorString(e: String): String := { "mapped-error" }
def mapOkSucc(x: Nat): Nat := { x + 1 }

def bimapError: Except(String, Nat) := {
  Except.bimap(String, String, Nat, Nat, mapErrorString, mapOkSucc, Except.error(String, Nat, "bad"))
}

def bimapOk: Except(String, Nat) := {
  Except.bimap(String, String, Nat, Nat, mapErrorString, mapOkSucc, Except.ok(String, Nat, 7))
}

theorem bimap_error_rfl: bimapError = Except.error(String, Nat, "mapped-error") := by rfl
theorem bimap_ok_rfl: bimapOk = Except.ok(String, Nat, 8) := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'except-bimap.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'bimapError'), 'Except.bimap error result must be emitted');
assert.ok(jsResult.emitted.some((d) => d.name === 'bimapOk'), 'Except.bimap ok result must be emitted');
const jsModule = requireFixtureModule(jsOut);
assertExcept(jsModule.bimapError, 0, 'mapped-error');
assertExcept(jsModule.bimapOk, 1, 8n);

const { outPath: tsOut } = buildTsFixture(fixture, 'except-bimap.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Except_bimap/, 'TypeScript emission should route Except.bimap through checked runtime helper');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assertExcept(compiled.bimapError, 0, 'mapped-error');
assertExcept(compiled.bimapOk, 1, 8n);

const badErrorMapper = createPsliveFixture('proofscript-except-bimap-bad-error-mapper-', {
  fileName: 'BadExceptBimapErrorMapper.ps',
  source: `
def badError(n: Nat): String := { "bad" }
def mapOkSucc(x: Nat): Nat := { x + 1 }
def bad: Except(String, Nat) := {
  Except.bimap(String, String, Nat, Nat, badError, mapOkSucc, Except.error(String, Nat, "bad"))
}
`,
});
const rejectedErrorMapper = expectPsliveRejected(['check', badErrorMapper.source, '--json']);
assert.match(rejectedErrorMapper.message, /type mismatch|expected Pi-domain type|String|Nat/i);

const badOkMapper = createPsliveFixture('proofscript-except-bimap-bad-ok-mapper-', {
  fileName: 'BadExceptBimapOkMapper.ps',
  source: `
def mapErrorString(e: String): String := { "mapped-error" }
def badOk(b: Bool): Nat := { 0 }
def bad: Except(String, Nat) := {
  Except.bimap(String, String, Nat, Nat, mapErrorString, badOk, Except.ok(String, Nat, 7))
}
`,
});
const rejectedOkMapper = expectPsliveRejected(['check', badOkMapper.source, '--json']);
assert.match(rejectedOkMapper.message, /type mismatch|expected Pi-domain type|Bool|Nat/i);

const badInput = createPsliveFixture('proofscript-except-bimap-bad-input-', {
  fileName: 'BadExceptBimapInput.ps',
  source: `
def mapErrorString(e: String): String := { "mapped-error" }
def mapOkSucc(x: Nat): Nat := { x + 1 }
def bad: Except(String, Nat) := {
  Except.bimap(String, String, Nat, Nat, mapErrorString, mapOkSucc, Option.some(Nat, 1))
}
`,
});
const rejectedInput = expectPsliveRejected(['check', badInput.source, '--json']);
assert.match(rejectedInput.message, /type mismatch|expected|Except|Option/i);

console.log('PSLIVE_EXCEPT_BIMAP=PASS');
