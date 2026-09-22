#!/usr/bin/env node
import './register-local-workspace.cts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { PSC1_SUPPORTED_FEATURES } = require('../packages/runtime/dist/index.js');

assert.ok(
  PSC1_SUPPORTED_FEATURES.some((feature) => /structure literal field punning/i.test(feature)),
  'runtime feature manifest must explicitly list checked structure literal field punning'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-structure-literal-punning-'));
const source = path.join(dir, 'StructLiteralPunning.ps');
const jsOut = path.join(dir, 'StructLiteralPunning.js');
fs.writeFileSync(source, `structure Point: Type where {
  x: Nat;
  y: Nat;
}

function mkPunnedPoint(x: Nat, y: Nat): Point := {
  {x, y}
}

def literalPunnedPoint: Point := { mkPunnedPoint(4, 5) }
def literalPunnedX: Nat := { literalPunnedPoint.x }
def literalPunnedY: Nat := { literalPunnedPoint.y }

theorem literal_punned_x_eq_four: literalPunnedX = 4 := by { rfl }
theorem literal_punned_y_eq_five: literalPunnedY = 5 := by { rfl }
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
for (const [name, expected] of [['literalPunnedX', '4'], ['literalPunnedY', '5']]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badMissingPunnedValue = path.join(dir, 'BadMissingPunnedValue.ps');
fs.writeFileSync(badMissingPunnedValue, `structure Point: Type where { x: Nat; y: Nat; }
def bad: Point := { {x, y := 2} }
`);
run(['check', badMissingPunnedValue, '--json'], 1);

const badPunnedType = path.join(dir, 'BadPunnedType.ps');
fs.writeFileSync(badPunnedType, `structure Point: Type where { x: Nat; y: Nat; }
def x: Bool := { true }
def y: Nat := { 2 }
def bad: Point := { {x, y} }
`);
run(['check', badPunnedType, '--json'], 1);

console.log('STRUCTURE_LITERAL_FIELD_PUNNING=PASS');
