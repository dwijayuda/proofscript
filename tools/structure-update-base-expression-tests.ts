#!/usr/bin/env node
import './register-local-workspace.cts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-structure-update-base-expr-'));
const source = path.join(dir, 'StructUpdateBaseExpr.ps');
const jsOut = path.join(dir, 'StructUpdateBaseExpr.js');
fs.writeFileSync(source, `structure Point: Type where {
  x: Nat;
  y: Nat;
}
structure Box: Type where {
  p: Point;
  label: Nat;
}
def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }
def pointFromParenBase: Point := { {(point) with x := 4} }
def pointFromDottedParenBase: Point := { {(box.p) with y := 6} }
def parenBaseX: Nat := { pointFromParenBase.x }
def parenBaseY: Nat := { pointFromParenBase.y }
def dottedParenBaseX: Nat := { pointFromDottedParenBase.x }
def dottedParenBaseY: Nat := { pointFromDottedParenBase.y }
theorem paren_base_x_eq_four: parenBaseX = 4 := by { rfl }
theorem paren_base_y_eq_two: parenBaseY = 2 := by { rfl }
theorem dotted_paren_base_x_eq_one: dottedParenBaseX = 1 := by { rfl }
theorem dotted_paren_base_y_eq_six: dottedParenBaseY = 6 := by { rfl }
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
for (const [name, expected] of [['parenBaseX', '4'], ['parenBaseY', '2'], ['dottedParenBaseX', '1'], ['dottedParenBaseY', '6']]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badNoWith = path.join(dir, 'BadParenthesizedStructInstance.ps');
fs.writeFileSync(badNoWith, `structure Point: Type where { x: Nat; y: Nat; }
def point: Point := { {x := 1, y := 2} }
def bad: Point := { {(point) x := 3} }
`);
run(['check', badNoWith, '--json'], 1);

const badNonStruct = path.join(dir, 'BadParenthesizedNonStructUpdate.ps');
fs.writeFileSync(badNonStruct, `def n: Nat := { 1 }
def bad: Nat := { {(n) with x := 3} }
`);
run(['check', badNonStruct, '--json'], 1);

console.log('STRUCTURE_UPDATE_BASE_EXPRESSION=PASS');
