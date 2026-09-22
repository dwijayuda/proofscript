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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-nat-mul-'));
const source = path.join(dir, 'NatMul.ps');
const jsOut = path.join(dir, 'nat-mul.js');
const tsOut = path.join(dir, 'nat-mul.ts');
const tsOutDir = path.join(dir, 'compiled');

fs.writeFileSync(source, `
function double(x: Nat): Nat := { x * 2 }
def six: Nat := { 2 * 3 }
def precedence: Nat := { 1 + 2 * 3 }
def grouped: Nat := { (1 + 2) * 3 }
def viaFunction: Nat := { double 4 }
theorem six_eq: six = 6 := by rfl
theorem precedence_eq: precedence = 7 := by rfl
theorem grouped_eq: grouped = 9 := by rfl
`);

const builtJs = runPslive(['build-js', source, '--out', jsOut, '--json']);
const parsedJs = JSON.parse(builtJs.stdout);
assert.equal(parsedJs.status, 'accepted');
assert.equal(parsedJs.target, 'js');
assert.ok(parsedJs.emitted.some(d => d.name === 'precedence'), 'multiplication declaration must be emitted');

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.six, 6n);
assert.equal(jsModule.precedence, 7n);
assert.equal(jsModule.grouped, 9n);
assert.equal(jsModule.viaFunction, 8n);

const builtTs = runPslive(['build-ts', source, '--out', tsOut, '--json']);
const parsedTs = JSON.parse(builtTs.stdout);
assert.equal(parsedTs.status, 'accepted');
assert.equal(parsedTs.target, 'ts');

const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /Nat_mul\(2n\)\(3n\)/, 'generated TS should lower * to checked Nat.mul runtime semantics');
const tsc = spawnSync('tsc', [tsOut, '--target', 'ES2022', '--module', 'CommonJS', '--strict', '--skipLibCheck', '--outDir', tsOutDir], { encoding: 'utf8' });
assert.equal(tsc.status, 0, `generated TypeScript with Nat * must typecheck\nSTDOUT:\n${tsc.stdout}\nSTDERR:\n${tsc.stderr}`);
const compiled = requireFromHere(path.join(tsOutDir, 'nat-mul.js'));
assert.equal(compiled.six, 6n);
assert.equal(compiled.precedence, 7n);
assert.equal(compiled.grouped, 9n);
assert.equal(compiled.viaFunction, 8n);

const boolBad = path.join(dir, 'BoolMulRejected.ps');
fs.writeFileSync(boolBad, `def bad: Nat := { true * 1 }\n`);
const rejected = runPslive(['check', boolBad, '--json'], 1);
const rejection = JSON.parse(rejected.stdout);
assert.equal(rejection.status, 'rejected');
assert.match(rejection.message, /application argument does not have the expected Pi-domain type|literal 'Nat' expected type|literal only at expected type Bool/i);

console.log('PSLIVE_NAT_MUL=PASS');
