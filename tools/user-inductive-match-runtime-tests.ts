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
  PSC1_SUPPORTED_FEATURES.some((feature) => /multi-constructor user inductive matches/i.test(feature)),
  'runtime feature manifest must explicitly list checked multi-constructor user inductive matches'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-user-inductive-match-runtime-'));
const source = path.join(dir, 'UserInductiveMatchRuntime.ps');
const jsOut = path.join(dir, 'UserInductiveMatchRuntime.js');
fs.writeFileSync(source, `inductive Color: Type where {
  | red
  | green
  | blue
}

inductive MaybeNat: Type where {
  | none
  | some (value: Nat)
}

def redColor: Color := { Color.red }
def greenColor: Color := { Color.green }
def blueColor: Color := { Color.blue }

function colorCode(c: Color): Nat := {
  match (c) {
    | Color.red => 1
    | Color.green => 2
    | Color.blue => 3
  }
}

def redCode: Nat := { colorCode(redColor) }
def greenCode: Nat := { colorCode(greenColor) }
def blueCode: Nat := { colorCode(blueColor) }

def maybeNone: MaybeNat := { MaybeNat.none }
def maybeSome: MaybeNat := { MaybeNat.some(7) }

function maybeDefault(m: MaybeNat): Nat := {
  match (m) {
    | MaybeNat.none => 0
    | MaybeNat.some value => value
  }
}

def noneDefault: Nat := { maybeDefault(maybeNone) }
def someDefault: Nat := { maybeDefault(maybeSome) }

theorem red_code_eq_one: redCode = 1 := by { rfl }
theorem green_code_eq_two: greenCode = 2 := by { rfl }
theorem blue_code_eq_three: blueCode = 3 := by { rfl }
theorem none_default_eq_zero: noneDefault = 0 := by { rfl }
theorem some_default_eq_seven: someDefault = 7 := by { rfl }
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
assert.ok(check.userDeclarations.some(d => d.name === 'Color' && d.kind === 'inductive'));
assert.ok(check.userDeclarations.some(d => d.name === 'MaybeNat' && d.kind === 'inductive'));
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
assert.ok(build.emitted.some(d => d.name === 'colorCode'));
assert.ok(build.emitted.some(d => d.name === 'maybeDefault'));

for (const [name, expected] of [
  ['redCode', '1'],
  ['greenCode', '2'],
  ['blueCode', '3'],
  ['noneDefault', '0'],
  ['someDefault', '7'],
]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badNonExhaustive = path.join(dir, 'BadNonExhaustiveUserInductive.ps');
fs.writeFileSync(badNonExhaustive, `inductive Color: Type where { | red | green | blue }
function bad(c: Color): Nat := {
  match (c) {
    | Color.red => 1
    | Color.green => 2
  }
}
`);
run(['check', badNonExhaustive, '--json'], 1);

const badRecursive = path.join(dir, 'BadRecursiveInductiveRuntime.ps');
fs.writeFileSync(badRecursive, `inductive Chain: Type where {
  | stop
  | next (tail: Chain)
}

def one: Chain := { Chain.next(Chain.stop) }
function bad(c: Chain): Nat := {
  match (c) {
    | Chain.stop => 0
    | Chain.next tail => 1
  }
}
def out: Nat := { bad(one) }
`);
const recursiveCheck = JSON.parse(run(['check', badRecursive, '--json']).stdout);
assert.equal(recursiveCheck.status, 'accepted');
const recursiveBuild = JSON.parse(run(['build-js', badRecursive, '--out', path.join(dir, 'RecursiveInductiveRuntime.js'), '--json']).stdout);
assert.equal(recursiveBuild.status, 'accepted');
const recursiveOut = JSON.parse(run(['run', badRecursive, '--call', 'out', '--json']).stdout);
assert.equal(recursiveOut.status, 'accepted');
assert.equal(recursiveOut.result, '1');

console.log('USER_INDUCTIVE_MATCH_RUNTIME=PASS');
