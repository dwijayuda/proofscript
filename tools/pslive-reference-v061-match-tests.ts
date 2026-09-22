#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildJsFixture, buildTsFixture, compileTypeScriptFixture, createPsliveFixture, expectPsliveRejected, requireFixtureModule, runPsliveJson } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-v061-match-', {
  fileName: 'ReferenceV061Match.ps',
  source: `
function optionGetD(value : Option(Nat), fallback : Nat) : Nat :=
  match value with {
    | .none => fallback;
    | .some x => x;
  };

const fromSome : Nat := optionGetD(Option.some(Nat, 7), 0);
const fromNone : Nat := optionGetD(Option.none(Nat), 9);

theorem fromSome_rfl : fromSome = 7 := by rfl
theorem fromNone_rfl : fromNone = 9 := by rfl
`,
});

const checked = runPsliveJson(['check', fixture.source, '--std', '--json']);
assert.ok(checked.userDeclarations.some((d) => d.name === 'optionGetD'), 'v0.6.1 match should check inside expression-bodied function');
assert.ok(checked.userDeclarations.some((d) => d.name === 'fromSome'));
assert.ok(checked.userDeclarations.some((d) => d.name === 'fromNone'));

const { outPath: jsOut } = buildJsFixture(fixture, 'reference-v061-match.js');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.fromSome, 7n);
assert.equal(jsModule.fromNone, 9n);

const { outPath: tsOut } = buildTsFixture(fixture, 'reference-v061-match.ts');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.fromSome, 7n);
assert.equal(compiled.fromNone, 9n);

const badCallPatternSugar = createPsliveFixture('proofscript-v061-bad-pattern-call-', {
  fileName: 'BadPatternCall.ps',
  source: `
function bad(value : Option(Nat)) : Nat :=
  match value with {
    | .some(x) => x;
  };
`,
});
const rejectedPatternCall = expectPsliveRejected(['check', badCallPatternSugar.source, '--std', '--json']);
assert.match(rejectedPatternCall.message, /pattern|expected|unsupported|constructor/i);

console.log('PSLIVE_REFERENCE_V061_MATCH=PASS');
