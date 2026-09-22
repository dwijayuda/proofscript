#!/usr/bin/env node
import './register-local-workspace.cts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-structure-match-runtime-'));
const source = path.join(dir, 'StructMatchRuntime.ps');
const jsOut = path.join(dir, 'StructMatchRuntime.js');
fs.writeFileSync(source, `structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }

function matchPointX(p: Point): Nat := {
  match (p) {
    | Point.mk x y => x
  }
}

function matchPointY(p: Point): Nat := {
  match (p) {
    | Point.mk x y => y
  }
}

def matchedX: Nat := { matchPointX(point) }
def matchedY: Nat := { matchPointY(point) }

theorem matched_x_eq_one: matchedX = 1 := by { rfl }
theorem matched_y_eq_two: matchedY = 2 := by { rfl }
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
assert.ok(check.userDeclarations.some(d => d.name === 'matchPointX'));
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
assert.ok(build.emitted.some(d => d.name === 'matchPointX'));
for (const [name, expected] of [['matchedX', '1'], ['matchedY', '2']]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const goodMultiCtor = path.join(dir, 'GoodMultiCtorRuntime.ps');
fs.writeFileSync(goodMultiCtor, `inductive Two: Type where {
  | a
  | b
}

def value: Two := { Two.a }
function toNat(t: Two): Nat := {
  match (t) {
    | Two.a => 1
    | Two.b => 2
  }
}
def out: Nat := { toNat(value) }
`);
const goodCheck = JSON.parse(run(['check', goodMultiCtor, '--json']).stdout);
assert.equal(goodCheck.status, 'accepted');
const goodBuild = JSON.parse(run(['build-js', goodMultiCtor, '--out', path.join(dir, 'GoodMultiCtorRuntime.js'), '--json']).stdout);
assert.equal(goodBuild.status, 'accepted');
const goodRun = JSON.parse(run(['run', goodMultiCtor, '--call', 'out', '--json']).stdout);
assert.equal(goodRun.status, 'accepted');
assert.equal(goodRun.result, '1');

console.log('STRUCTURE_MATCH_RUNTIME=PASS');
