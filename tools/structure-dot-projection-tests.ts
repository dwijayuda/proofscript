#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const run = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-structure-dot-'));
const good = path.join(dir, 'StructureDot.ps');
fs.writeFileSync(good, `structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }
def pointDotX: Nat := { point.x }
def pointDotY: Nat := { point.y }
theorem point_dot_x_eq_one: pointDotX = 1 := by { rfl }
theorem point_dot_y_eq_two: pointDotY = 2 := by { rfl }
`);

const check = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', good, '--json']);
assert.equal(check.status, 0, check.stderr || check.stdout);
const checkJson = JSON.parse(check.stdout);
assert.equal(checkJson.status, 'accepted');
assert.ok(checkJson.userDeclarations.some(d => d.name === 'pointDotX' && d.kind === 'definition'));
assert.ok(checkJson.userDeclarations.some(d => d.name === 'point_dot_x_eq_one' && d.kind === 'theorem'));

const build = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', good, '--out', path.join(dir, 'StructureDot.js'), '--json']);
assert.equal(build.status, 0, build.stderr || build.stdout);

for (const [call, expected] of [['pointDotX', '1'], ['pointDotY', '2']]) {
  const result = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', call, '--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const json = JSON.parse(result.stdout);
  assert.equal(json.status, 'accepted');
  assert.equal(json.result, expected);
}

const badField = path.join(dir, 'BadStructureDotField.ps');
fs.writeFileSync(badField, `structure Point: Type where {
  x: Nat;
}
def point: Point := { {x := 1} }
def bad: Nat := { point.y }
`);
const badFieldResult = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badField, '--json']);
assert.notEqual(badFieldResult.status, 0, 'unknown dotted field should reject');
assert.match(`${badFieldResult.stdout}\n${badFieldResult.stderr}`, /unknown structure field 'y'|unknown identifier: point\.y/i);

const badBase = path.join(dir, 'BadStructureDotBase.ps');
fs.writeFileSync(badBase, `def n: Nat := { 1 }
def bad: Nat := { n.x }
`);
const badBaseResult = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badBase, '--json']);
assert.notEqual(badBaseResult.status, 0, 'dotted projection on non-structure base should reject');
assert.match(`${badBaseResult.stdout}\n${badBaseResult.stderr}`, /unknown identifier: n\.x|structure|projection/i);

console.log(`STRUCTURE_DOT_PROJECTION_TESTS=PASS semanticSha256=${checkJson.semanticSha256}`);
