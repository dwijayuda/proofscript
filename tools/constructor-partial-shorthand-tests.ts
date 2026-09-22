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
  PSC1_SUPPORTED_FEATURES.some((feature) => /partial constructor shorthand/i.test(feature)),
  'runtime feature manifest must explicitly list checked expected-function-type partial constructor shorthand'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-constructor-partial-shorthand-'));
const source = path.join(dir, 'ConstructorPartialShorthand.ps');
const jsOut = path.join(dir, 'ConstructorPartialShorthand.js');
fs.writeFileSync(source, `inductive MaybeNat: Type where {
  | none
  | some (value: Nat)
}

def mkSome: Nat -> MaybeNat := {
  some
}

def fromMk: MaybeNat := {
  mkSome(13)
}

function maybeDefault(m: MaybeNat): Nat := {
  match (m) {
    | none => 0
    | some value => value
  }
}

def fromMkDefault: Nat := {
  maybeDefault(fromMk)
}

theorem from_mk_default_eq_thirteen: fromMkDefault = 13 := by { rfl }
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
assert.ok(check.userDeclarations.some(d => d.name === 'mkSome'));
assert.ok(check.userDeclarations.some(d => d.name === 'from_mk_default_eq_thirteen'));
const build = JSON.parse(run(['build-js', source, '--out', jsOut, '--json']).stdout);
assert.equal(build.status, 'accepted');
assert.ok(build.emitted.some(d => d.name === 'mkSome'));
const result = JSON.parse(run(['run', source, '--call', 'fromMkDefault', '--json']).stdout);
assert.equal(result.status, 'accepted');
assert.equal(result.result, '13');

const badNoFunctionExpected = path.join(dir, 'BadNoFunctionExpected.ps');
fs.writeFileSync(badNoFunctionExpected, `inductive MaybeNat: Type where { | none | some (value: Nat) }
def bad := { some }
`);
run(['check', badNoFunctionExpected, '--json'], 1);

const badWrongCodomain = path.join(dir, 'BadWrongCodomain.ps');
fs.writeFileSync(badWrongCodomain, `inductive MaybeNat: Type where { | none | some (value: Nat) }
def bad: Nat -> Nat := { some }
`);
run(['check', badWrongCodomain, '--json'], 1);

const badTooManyArgsForPartial = path.join(dir, 'BadTooManyArgsForPartial.ps');
fs.writeFileSync(badTooManyArgsForPartial, `inductive MaybeNat: Type where { | none | some (value: Nat) }
def bad: Nat -> MaybeNat := { some(1, 2) }
`);
run(['check', badTooManyArgsForPartial, '--json'], 1);

const badLocalWins = path.join(dir, 'BadLocalWins.ps');
fs.writeFileSync(badLocalWins, `inductive MaybeNat: Type where { | none | some (value: Nat) }
function useLocal(some: Nat): Nat -> MaybeNat := { some }
`);
run(['check', badLocalWins, '--json'], 1);

console.log('CONSTRUCTOR_PARTIAL_SHORTHAND=PASS');
