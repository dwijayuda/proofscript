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
  PSC1_SUPPORTED_FEATURES.some((feature) => /self-recursive user inductive primitive recursion/i.test(feature)),
  'runtime feature manifest must explicitly list bounded self-recursive user inductive primitive recursion'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-user-recursive-inductive-runtime-'));
const source = path.join(dir, 'UserRecursiveInductiveRuntime.ps');
const jsOut = path.join(dir, 'UserRecursiveInductiveRuntime.js');
fs.writeFileSync(source, `inductive NatList: Type where {
  | nil
  | cons (head: Nat) (tail: NatList)
}

def l0: NatList := { nil }
def l1: NatList := { cons(5, l0) }
def l2: NatList := { cons(6, l1) }

function isEmpty(xs: NatList): Bool := {
  match (xs) {
    | nil => true
    | cons h t => false
  }
}

function length(xs: NatList): Nat := {
  match (xs) {
    | nil => 0
    | cons h t => Nat.succ(length(t))
  }
}

def isEmptyL0: Bool := { isEmpty(l0) }
def isEmptyL1: Bool := { isEmpty(l1) }
def lenL0: Nat := { length(l0) }
def lenL1: Nat := { length(l1) }
def lenL2: Nat := { length(l2) }

theorem len_l0_eq_zero: lenL0 = 0 := by { rfl }
theorem len_l1_eq_one: lenL1 = 1 := by { rfl }
theorem len_l2_eq_two: lenL2 = 2 := by { rfl }
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
assert.ok(check.userDeclarations.some(d => d.name === 'NatList' && d.kind === 'inductive'));
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
assert.ok(build.emitted.some(d => d.name === 'length'));

for (const [name, expected] of [
  ['isEmptyL0', 'true'],
  ['isEmptyL1', 'false'],
  ['lenL0', '0'],
  ['lenL1', '1'],
  ['lenL2', '2'],
]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badNestedRecursive = path.join(dir, 'BadNestedRecursiveField.ps');
fs.writeFileSync(badNestedRecursive, `inductive Wrap: Type where {
  | leaf
  | nest (f: Wrap -> Wrap)
}

def value: Wrap := { Wrap.leaf }
function tag(w: Wrap): Nat := {
  match (w) {
    | Wrap.leaf => 0
    | Wrap.nest f => 1
  }
}
def out: Nat := { tag(value) }
`);
run(['check', badNestedRecursive, '--json'], 1);

console.log('USER_RECURSIVE_INDUCTIVE_RUNTIME=PASS');
