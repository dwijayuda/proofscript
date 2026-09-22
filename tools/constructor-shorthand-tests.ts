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
  PSC1_SUPPORTED_FEATURES.some((feature) => /constructor shorthand/i.test(feature)),
  'runtime feature manifest must explicitly list checked expected-type constructor shorthand'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-constructor-shorthand-'));
const source = path.join(dir, 'ConstructorShorthand.ps');
const jsOut = path.join(dir, 'ConstructorShorthand.js');
fs.writeFileSync(source, `inductive Color: Type where {
  | red
  | green
  | blue
}

inductive MaybeNat: Type where {
  | none
  | some (value: Nat)
}

def redShort: Color := { red }
def greenShort: Color := { green }
def someShort: MaybeNat := { some(7) }

function colorCode(c: Color): Nat := {
  match (c) {
    | red => 1
    | green => 2
    | blue => 3
  }
}

function maybeDefault(m: MaybeNat): Nat := {
  match (m) {
    | none => 0
    | some value => value
  }
}

def redShortCode: Nat := { colorCode(redShort) }
def greenShortCode: Nat := { colorCode(greenShort) }
def someShortDefault: Nat := { maybeDefault(someShort) }

theorem red_short_code_eq_one: redShortCode = 1 := by { rfl }
theorem green_short_code_eq_two: greenShortCode = 2 := by { rfl }
theorem some_short_default_eq_seven: someShortDefault = 7 := by { rfl }
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
assert.ok(check.userDeclarations.some(d => d.name === 'redShort'));
assert.ok(check.userDeclarations.some(d => d.name === 'someShort'));
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
assert.ok(build.emitted.some(d => d.name === 'redShort'));
assert.ok(build.emitted.some(d => d.name === 'someShort'));
for (const [name, expected] of [
  ['redShortCode', '1'],
  ['greenShortCode', '2'],
  ['someShortDefault', '7'],
]) {
  const result = JSON.parse(run(['run', source, '--call', name, '--json']).stdout);
  assert.equal(result.status, 'accepted');
  assert.equal(result.result, expected, `${name} result`);
}

const badNoExpected = path.join(dir, 'BadNoExpectedConstructorShorthand.ps');
fs.writeFileSync(badNoExpected, `inductive Color: Type where { | red | green }
def bad := { red }
`);
run(['check', badNoExpected, '--json'], 1);

const badWrongExpected = path.join(dir, 'BadWrongExpectedConstructorShorthand.ps');
fs.writeFileSync(badWrongExpected, `inductive Color: Type where { | red | green }
def bad: Nat := { red }
`);
run(['check', badWrongExpected, '--json'], 1);

const badArity = path.join(dir, 'BadConstructorShorthandArity.ps');
fs.writeFileSync(badArity, `inductive MaybeNat: Type where { | none | some (value: Nat) }
def bad: MaybeNat := { some }
`);
run(['check', badArity, '--json'], 1);

const badGlobalWins = path.join(dir, 'BadConstructorShorthandGlobalWins.ps');
fs.writeFileSync(badGlobalWins, `inductive Color: Type where { | red | green }
def red: Nat := { 1 }
def bad: Color := { red }
`);
run(['check', badGlobalWins, '--json'], 1);

console.log('CONSTRUCTOR_SHORTHAND=PASS');
