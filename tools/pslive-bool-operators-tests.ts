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

const fixture = createPsliveFixture('proofscript-bool-operators-', {
  fileName: 'BoolOperators.ps',
  source: `
function and2(a: Bool, b: Bool): Bool := { a && b }
function or2(a: Bool, b: Bool): Bool := { a || b }
def both: Bool := { true && false }
def either: Bool := { false || true }
def precedence: Bool := { false || true && false }
def grouped: Bool := { (false || true) && true }
def choose: Nat := { if true && (false || true) then 7 else 9 }
theorem both_eq: both = false := by rfl
theorem either_eq: either = true := by rfl
theorem precedence_eq: precedence = false := by rfl
theorem grouped_eq: grouped = true := by rfl
theorem choose_eq: choose = 7 := by rfl
`,
});

const builtJs = buildJsFixture(fixture, 'bool-operators.js');
assert.ok(builtJs.result.emitted.some(d => d.name === 'and2'), 'Boolean operator declaration must be emitted');

const jsModule = requireFixtureModule(builtJs.outPath);
assert.equal(jsModule.both, false);
assert.equal(jsModule.either, true);
assert.equal(jsModule.precedence, false);
assert.equal(jsModule.grouped, true);
assert.equal(jsModule.choose, 7n);
assert.equal(jsModule.and2(true)(true), true);
assert.equal(jsModule.and2(true)(false), false);
assert.equal(jsModule.or2(false)(false), false);
assert.equal(jsModule.or2(false)(true), true);

const builtTs = buildTsFixture(fixture, 'bool-operators.ts');
const tsSource = fs.readFileSync(builtTs.outPath, 'utf8');
assert.match(tsSource, /\?/, 'generated TS should lower Boolean operators through conditional Bool.rec semantics');
const compiledPath = compileTypeScriptFixture(builtTs.outPath, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledPath);
assert.equal(compiled.both, false);
assert.equal(compiled.either, true);
assert.equal(compiled.precedence, false);
assert.equal(compiled.grouped, true);
assert.equal(compiled.choose, 7n);

const bad = fixture.write('NatAndRejected.ps', 'def bad: Bool := { 1 && true }\n');
const rejected = expectPsliveRejected(['check', bad, '--json']);
assert.match(rejected.message, /expected type Bool|literal.*expected type Bool|literal only at expected type Nat|does not have the expected/i);

console.log('PSLIVE_BOOL_OPERATORS=PASS');
