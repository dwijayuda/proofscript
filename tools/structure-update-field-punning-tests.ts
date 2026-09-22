#!/usr/bin/env node
import './register-local-workspace.cts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-structure-update-punning-'));
const source = path.join(dir, 'StructUpdatePunning.ps');
const jsOut = path.join(dir, 'StructUpdatePunning.js');
fs.writeFileSync(source, `structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }

function setX(p: Point, x: Nat): Point := {
  {p with x}
}

def pointPunned: Point := { setX(point, 6) }
def pointPunnedX: Nat := { pointPunned.x }
def pointPunnedY: Nat := { pointPunned.y }

theorem point_punned_x_eq_six: pointPunnedX = 6 := by { rfl }
theorem point_punned_y_eq_two: pointPunnedY = 2 := by { rfl }
`);

function run(args, expected = 0) {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', ...args], { cwd: root, encoding: 'utf8' });
  if (r.status !== expected) {
    throw new Error(`${args.join(' ')} exited ${r.status}, expected ${expected}\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
  }
  return r;
}

const check = JSON.parse(run(['check', source, '--json']).stdout);
assert.equal(check.status, 'accepted');
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
for (const [name, expected] of [['pointPunnedX', '6'], ['pointPunnedY', '2']]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badMissingValue = path.join(dir, 'BadPunnedMissingValue.ps');
fs.writeFileSync(badMissingValue, `structure Point: Type where { x: Nat; y: Nat; }
def point: Point := { {x := 1, y := 2} }
def bad: Point := { {point with x} }
`);
run(['check', badMissingValue, '--json'], 1);

const badUnknownField = path.join(dir, 'BadPunnedUnknownField.ps');
fs.writeFileSync(badUnknownField, `structure Point: Type where { x: Nat; y: Nat; }
def point: Point := { {x := 1, y := 2} }
def z: Nat := { 9 }
def bad: Point := { {point with z} }
`);
run(['check', badUnknownField, '--json'], 1);

console.log('STRUCTURE_UPDATE_FIELD_PUNNING=PASS');
