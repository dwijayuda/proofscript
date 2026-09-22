#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PSC1_SUPPORTED_FEATURES } from '../packages/runtime/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-structure-update-red-'));
const source = path.join(dir, 'StructUpdate.ps');
fs.writeFileSync(source, `structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }
def pointMoved: Point := { {point with x := 3} }
def pointMovedX: Nat := { pointMoved.x }
def pointMovedY: Nat := { pointMoved.y }
theorem point_moved_x_eq_three: pointMovedX = 3 := by { rfl }
theorem point_moved_y_eq_two: pointMovedY = 2 := by { rfl }
`);
const run = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
const check = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', source, '--json']);
assert.equal(check.status, 0, check.stdout + check.stderr);
const build = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', source, '--out', path.join(dir, 'StructUpdate.js'), '--json']);
assert.equal(build.status, 0, build.stdout + build.stderr);
const movedXRun = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', source, '--call', 'pointMovedX', '--json']);
assert.equal(movedXRun.status, 0, movedXRun.stdout + movedXRun.stderr);
const movedYRun = run(['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', source, '--call', 'pointMovedY', '--json']);
assert.equal(movedYRun.status, 0, movedYRun.stdout + movedYRun.stderr);
const movedX = JSON.parse(movedXRun.stdout);
const movedY = JSON.parse(movedYRun.stdout);
assert.equal(movedX.result, '3');
assert.equal(movedY.result, '2');
assert.ok(PSC1_SUPPORTED_FEATURES.some(x => /structure update/i.test(x)), 'runtime feature manifest must explicitly list checked executable structure update');
console.log('STRUCTURE_UPDATE_RUNTIME=PASS');
