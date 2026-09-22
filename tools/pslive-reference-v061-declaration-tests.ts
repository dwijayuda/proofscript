#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildJsFixture, buildTsFixture, compileTypeScriptFixture, createPsliveFixture, expectPsliveRejected, requireFixtureModule, runPsliveJson } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-v061-declarations-', {
  fileName: 'ReferenceV061Declarations.ps',
  source: `
const answer : Nat := 42;
const increment : Nat -> Nat := fun (x : Nat) => x + 1;
function add(x : Nat, y : Nat) : Nat := x + y;
def mul(x : Nat, y : Nat) : Nat := x * y;
def fortyFour : Nat := add(answer, 2);
def incremented : Nat := increment(4);
def product : Nat := mul(6, 7);
function max2(x : Nat, y : Nat) : Nat := if (x > y) { x } else { y };
def maxValue : Nat := max2(9, 4);
theorem fortyFour_rfl : fortyFour = 44 := by rfl
theorem incremented_rfl : incremented = 5 := by rfl
theorem product_rfl : product = 42 := by rfl
theorem maxValue_rfl : maxValue = 9 := by rfl
`,
});

const checkedCore = path.join(fixture.dir, 'reference-v061.core.json');
const checked = runPsliveJson(['check', fixture.source, '--std', '--emit-core', checkedCore, '--json']);
assert.ok(checked.userDeclarations.some((d) => d.name === 'answer'), 'const alias must lower to a checked definition');
assert.ok(checked.userDeclarations.some((d) => d.name === 'add'), 'function alias must lower to a checked definition');
assert.ok(checked.userDeclarations.some((d) => d.name === 'mul'), 'def explicit parameter groups must lower to a checked definition');
assert.ok(fs.existsSync(checkedCore), 'check --emit-core should write the checked Core artifact');

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'reference-v061-declarations.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'answer'));
assert.ok(jsResult.emitted.some((d) => d.name === 'add'));
assert.ok(jsResult.emitted.some((d) => d.name === 'mul'));
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.answer, 42n);
assert.equal(jsModule.fortyFour, 44n);
assert.equal(jsModule.incremented, 5n);
assert.equal(jsModule.product, 42n);
assert.equal(jsModule.maxValue, 9n);

const { outPath: tsOut } = buildTsFixture(fixture, 'reference-v061-declarations.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /export const answer/, 'TypeScript emission should export the checked const alias result');
assert.match(tsSource, /export const add/, 'TypeScript emission should export the checked function alias result');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.fortyFour, 44n);
assert.equal(compiled.incremented, 5n);
assert.equal(compiled.product, 42n);
assert.equal(compiled.maxValue, 9n);

const badConstWithParams = createPsliveFixture('proofscript-v061-bad-const-params-', {
  fileName: 'BadConstWithParams.ps',
  source: `const add(x : Nat, y : Nat) : Nat := x + y;`,
});
const rejectedConst = expectPsliveRejected(['check', badConstWithParams.source, '--std', '--json']);
assert.match(rejectedConst.message, /const alias is binderless|const.*binderless|use def\/function/i);

const badFunctionWithoutParams = createPsliveFixture('proofscript-v061-bad-function-no-params-', {
  fileName: 'BadFunctionWithoutParams.ps',
  source: `function answer : Nat := 42;`,
});
const rejectedFunction = expectPsliveRejected(['check', badFunctionWithoutParams.source, '--std', '--json']);
assert.match(rejectedFunction.message, /function alias requires at least one typed binder|function.*requires.*binder/i);

const badReturnBlock = createPsliveFixture('proofscript-v061-bad-return-block-', {
  fileName: 'BadReturnBlock.ps',
  source: `function f(x : Nat) : Nat { return x; }`,
});
const rejectedReturn = expectPsliveRejected(['check', badReturnBlock.source, '--std', '--json']);
assert.match(rejectedReturn.message, /expected ':='|return|block-bodied declarations/i);


const badBracedIfWithoutParens = createPsliveFixture('proofscript-v061-bad-if-no-parens-', {
  fileName: 'BadBracedIfWithoutParens.ps',
  source: `def bad(x : Nat, y : Nat) : Nat := if x > y { x } else { y };`,
});
const rejectedIf = expectPsliveRejected(['check', badBracedIfWithoutParens.source, '--std', '--json']);
assert.match(rejectedIf.message, /requires `then`|parenthesized condition|if/i);

console.log('PSLIVE_REFERENCE_V061_DECLARATIONS=PASS');
