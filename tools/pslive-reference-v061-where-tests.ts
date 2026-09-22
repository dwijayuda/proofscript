#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildJsFixture, buildTsFixture, compileTypeScriptFixture, createPsliveFixture, expectPsliveRejected, requireFixtureModule, runPsliveJson } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-v061-where-', {
  fileName: 'ReferenceV061Where.ps',
  source: `
function addViaWhere(x : Nat, y : Nat) : Nat := helper(x, y) where {
  helper(a : Nat, b : Nat) : Nat := a + b;
};

function chainedWhere(x : Nat) : Nat := plusTwo(x) where {
  plusOne(a : Nat) : Nat := a + 1;
  plusTwo(a : Nat) : Nat := plusOne(a) + 1;
};

const sum : Nat := addViaWhere(20, 22);
const chained : Nat := chainedWhere(40);

theorem sum_rfl : sum = 42 := by rfl
theorem chained_rfl : chained = 42 := by rfl
`,
});

const checked = runPsliveJson(['check', fixture.source, '--std', '--json']);
assert.ok(checked.userDeclarations.some((d) => d.name === 'addViaWhere'), 'v0.6.1 where body should lower to a checked definition');
assert.ok(checked.userDeclarations.some((d) => d.name === 'chainedWhere'));
assert.ok(checked.userDeclarations.some((d) => d.name === 'sum'));
assert.ok(checked.userDeclarations.some((d) => d.name === 'chained'));

const { outPath: jsOut } = buildJsFixture(fixture, 'reference-v061-where.js');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.sum, 42n);
assert.equal(jsModule.chained, 42n);

const { outPath: tsOut } = buildTsFixture(fixture, 'reference-v061-where.ts');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.sum, 42n);
assert.equal(compiled.chained, 42n);

const badEmptyWhere = createPsliveFixture('proofscript-v061-bad-empty-where-', {
  fileName: 'BadEmptyWhere.ps',
  source: `function bad(x : Nat) : Nat := x where { };`,
});
const rejectedEmpty = expectPsliveRejected(['check', badEmptyWhere.source, '--std', '--json']);
assert.match(rejectedEmpty.message, /where.*at least one|local helper/i);

const badRecursiveWhere = createPsliveFixture('proofscript-v061-bad-recursive-where-', {
  fileName: 'BadRecursiveWhere.ps',
  source: `function bad(x : Nat) : Nat := helper(x) where { helper(y : Nat) : Nat := helper(y); };`,
});
const rejectedRecursive = expectPsliveRejected(['check', badRecursiveWhere.source, '--std', '--json']);
assert.match(rejectedRecursive.message, /recursive|where helper/i);

console.log('PSLIVE_REFERENCE_V061_WHERE=PASS');
