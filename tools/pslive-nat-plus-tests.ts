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

const fixture = createPsliveFixture('proofscript-nat-plus-', {
  fileName: 'NatPlus.ps',
  source: `
function addThree(x: Nat): Nat := { x + 3 }
def seven: Nat := { 3 + 4 }
def nested: Nat := { 1 + 2 + 3 }
def viaFunction: Nat := { addThree(4) }
theorem seven_eq_builtin: seven = Nat.add(3, 4) := by { rfl }
theorem nested_eq_six: nested = 6 := by { rfl }
`,
});

const builtJs = buildJsFixture(fixture, 'nat-plus.js');
assert.ok(builtJs.result.emitted.some(d => d.name === 'nested'), 'nested addition declaration must be emitted');
assert.ok(builtJs.result.skipped.some(d => d.name === 'seven_eq_builtin' && d.reason === 'non-executable declaration'));

const jsModule = requireFixtureModule(builtJs.outPath);
assert.equal(jsModule.seven, 7n);
assert.equal(jsModule.nested, 6n);
assert.equal(jsModule.viaFunction, 7n);

const builtTs = buildTsFixture(fixture, 'nat-plus.ts');
const tsSource = fs.readFileSync(builtTs.outPath, 'utf8');
assert.match(tsSource, /Nat_add\(3n\)\(4n\)/, 'generated TS should lower + to checked Nat.add runtime semantics');
const compiledPath = compileTypeScriptFixture(builtTs.outPath, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledPath);
assert.equal(compiled.seven, 7n);
assert.equal(compiled.nested, 6n);
assert.equal(compiled.viaFunction, 7n);
assert.equal(compiled.default.__proofscript.requiresLean4, false);

const boolBad = fixture.write('BoolPlusRejected.ps', 'def bad: Nat := { true + 1 }\n');
const rejected = expectPsliveRejected(['check', boolBad, '--json']);
assert.match(rejected.message, /application argument does not have the expected Pi-domain type|literal 'Nat' expected type|literal only at expected type Bool/i);

console.log('PSLIVE_NAT_PLUS=PASS');
