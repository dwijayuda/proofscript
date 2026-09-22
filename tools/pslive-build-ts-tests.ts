#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildTsFixture,
  compileTypeScriptFixture,
  createPsliveFixture,
  requireFixtureModule,
} from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-build-ts-', {
  fileName: 'BuildTsSmoke.ps',
  source: `
function add2(x: Nat): Nat := { Nat.add(x, 2) }
def five: Nat := { add2(3) }
structure Point: Type where {
  x: Nat;
  y: Nat;
}
def point: Point := { {x := 4, y := 9} }
def pointX: Nat := { point.x }
inductive MaybeNat: Type where { | none | some (value: Nat) }
def someFive: MaybeNat := { some(five) }
function maybeDefault(m: MaybeNat): Nat := { match (m) { | none => 0 | some value => value } }
def observed: Nat := { maybeDefault(someFive) }
theorem observed_eq_five: observed = 5 := by { rfl }
`,
});

const built = buildTsFixture(fixture, 'build-ts-smoke.ts');
assert.ok(built.result.emitted.some(d => d.name === 'observed'), 'observed must be emitted');
assert.ok(built.result.skipped.some(d => d.name === 'observed_eq_five' && d.reason === 'non-executable declaration'), 'theorem must stay non-executable');

const ts = fs.readFileSync(built.outPath, 'utf8');
assert.match(ts, /export const add2/);
assert.match(ts, /export const observed/);
assert.match(ts, /export default/);
assert.match(ts, /trusted-boundary standalone small subset/);

const compiledPath = compileTypeScriptFixture(built.outPath, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledPath);
assert.equal(compiled.five, 5n);
assert.equal(compiled.pointX, 4n);
assert.equal(compiled.observed, 5n);
assert.equal(compiled.default.observed, 5n);
assert.equal(compiled.default.__proofscript.requiresLean4, false);

console.log('PSLIVE_BUILD_TS=PASS');
