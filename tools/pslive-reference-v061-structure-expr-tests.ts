#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildJsFixture, buildTsFixture, compileTypeScriptFixture, createPsliveFixture, expectPsliveRejected, requireFixtureModule, runPsliveJson } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-v061-structure-expr-', {
  fileName: 'ReferenceV061StructureExpr.ps',
  source: `
structure Pair where {
  fst : Nat;
  snd : Nat;
}

const pair : Pair := { fst := 20, snd := 22 };
function setFst(p : Pair, x : Nat) : Pair := { p with fst := x };
const moved : Pair := setFst(pair, 40);
const sum : Nat := pair.fst + pair.snd;
const movedSum : Nat := moved.fst + moved.snd;
def legacyCheckedBlock : Nat := { 42 }

theorem sum_rfl : sum = 42 := by rfl
theorem movedSum_rfl : movedSum = 62 := by rfl
theorem legacyCheckedBlock_rfl : legacyCheckedBlock = 42 := by rfl
`,
});

const checked = runPsliveJson(['check', fixture.source, '--std', '--json']);
assert.ok(checked.userDeclarations.some((d) => d.name === 'Pair'), 'v0.6.1 structure body should check');
assert.ok(checked.userDeclarations.some((d) => d.name === 'pair'), 'expression-bodied structure literal should check');
assert.ok(checked.userDeclarations.some((d) => d.name === 'setFst'), 'expression-bodied structure update should check');
assert.ok(checked.userDeclarations.some((d) => d.name === 'sum'));
assert.ok(checked.userDeclarations.some((d) => d.name === 'movedSum'));

const { outPath: jsOut } = buildJsFixture(fixture, 'reference-v061-structure-expr.js');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.sum, 42n);
assert.equal(jsModule.movedSum, 62n);
assert.equal(jsModule.legacyCheckedBlock, 42n);

const { outPath: tsOut } = buildTsFixture(fixture, 'reference-v061-structure-expr.ts');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.sum, 42n);
assert.equal(compiled.movedSum, 62n);
assert.equal(compiled.legacyCheckedBlock, 42n);

const badEmptyLiteral = createPsliveFixture('proofscript-v061-bad-empty-struct-lit-', {
  fileName: 'BadEmptyStructLiteral.ps',
  source: `
structure Pair where { fst : Nat; }
const bad : Pair := { };
`,
});
const rejectedEmpty = expectPsliveRejected(['check', badEmptyLiteral.source, '--std', '--json']);
assert.match(rejectedEmpty.message, /empty structure instances|expected term|unsupported/i);

const badSinglePunnedLiteral = createPsliveFixture('proofscript-v061-bad-single-punned-struct-lit-', {
  fileName: 'BadSinglePunnedStructLiteral.ps',
  source: `
structure Pair where { fst : Nat; }
const fst : Nat := 1;
const bad : Pair := { fst };
`,
});
const rejectedPunned = expectPsliveRejected(['check', badSinglePunnedLiteral.source, '--std', '--json']);
assert.match(rejectedPunned.message, /expected|structure|constructor|Pair|type/i);

console.log('PSLIVE_REFERENCE_V061_STRUCTURE_EXPR=PASS');
