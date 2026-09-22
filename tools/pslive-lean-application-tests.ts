#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const runPslive = (args, expect = 0) => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, expect, `${args.join(' ')} expected ${expect}, got ${r.status}\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
  return r;
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-lean-app-'));
const source = path.join(dir, 'LeanApplication.ps');
const jsOut = path.join(dir, 'lean-application.js');
const tsOut = path.join(dir, 'lean-application.ts');
const tsOutDir = path.join(dir, 'compiled');

fs.writeFileSync(source, `
function addTwo(x: Nat): Nat := { Nat.add x 2 }
function inc(x: Nat): Nat := { Nat.succ x }
def seven: Nat := { addTwo 5 }
def nested: Nat := { Nat.add (Nat.succ 2) 4 }
def mixed: Nat := { Nat.add(inc 2, addTwo 3) }
theorem seven_eq: seven = 7 := by { rfl }
theorem nested_eq: nested = 7 := by { rfl }
theorem mixed_eq: mixed = 8 := by { rfl }
`);

const checked = runPslive(['check', source, '--json']);
const checkedJson = JSON.parse(checked.stdout);
assert.equal(checkedJson.status, 'accepted');
assert.equal(checkedJson.userDeclarations.length, 8);

const builtJs = runPslive(['build-js', source, '--out', jsOut, '--json']);
const parsedJs = JSON.parse(builtJs.stdout);
assert.equal(parsedJs.status, 'accepted');
assert.equal(parsedJs.target, 'js');
assert.ok(parsedJs.emitted.some(d => d.name === 'mixed'), 'mixed whitespace/parenthesized call declaration must be emitted');

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.addTwo(5n), 7n);
assert.equal(jsModule.inc(4n), 5n);
assert.equal(jsModule.seven, 7n);
assert.equal(jsModule.nested, 7n);
assert.equal(jsModule.mixed, 8n);

const builtTs = runPslive(['build-ts', source, '--out', tsOut, '--json']);
const parsedTs = JSON.parse(builtTs.stdout);
assert.equal(parsedTs.status, 'accepted');
assert.equal(parsedTs.target, 'ts');

const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Nat_add\(x0\)\(2n\)/, 'generated TS should lower whitespace Nat.add application to curried runtime call');
const tsc = spawnSync('tsc', [tsOut, '--target', 'ES2022', '--module', 'CommonJS', '--strict', '--skipLibCheck', '--outDir', tsOutDir], { encoding: 'utf8' });
assert.equal(tsc.status, 0, `generated TypeScript with Lean-style application must typecheck\nSTDOUT:\n${tsc.stdout}\nSTDERR:\n${tsc.stderr}`);
const compiled = requireFromHere(path.join(tsOutDir, 'lean-application.js'));
assert.equal(compiled.addTwo(5n), 7n);
assert.equal(compiled.inc(4n), 5n);
assert.equal(compiled.seven, 7n);
assert.equal(compiled.nested, 7n);
assert.equal(compiled.mixed, 8n);
assert.equal(compiled.default.__proofscript.requiresLean4, false);

const bad = path.join(dir, 'BadWhitespaceApplication.ps');
fs.writeFileSync(bad, `def bad: Nat := { true 1 }\n`);
const rejected = runPslive(['check', bad, '--json'], 1);
const rejection = JSON.parse(rejected.stdout);
assert.equal(rejection.status, 'rejected');
assert.match(rejection.message, /expected function type|application target is not a Pi type|not a Pi|application head is not a function/i);

console.log('PSLIVE_LEAN_APPLICATION=PASS');
