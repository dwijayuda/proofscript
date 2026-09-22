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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-bool-if-'));
const source = path.join(dir, 'BoolIf.ps');
const jsOut = path.join(dir, 'bool-if.js');
const tsOut = path.join(dir, 'bool-if.ts');
const tsOutDir = path.join(dir, 'compiled');

fs.writeFileSync(source, `
function choose(b: Bool, x: Nat, y: Nat): Nat := { if b then x else y }
def a: Nat := { if true then 4 else 5 }
def b: Nat := { if false then 4 else 5 }
def nested: Nat := { if true then (if false then 1 else 2) else 3 }
def spacedAppCondition: Nat := { if Bool.true then Nat.add 2 3 else 0 }
theorem a_eq: a = 4 := by rfl
theorem b_eq: b = 5 := by rfl
theorem nested_eq: nested = 2 := by rfl
`);

const builtJs = runPslive(['build-js', source, '--out', jsOut, '--json']);
const parsedJs = JSON.parse(builtJs.stdout);
assert.equal(parsedJs.status, 'accepted');
assert.equal(parsedJs.target, 'js');
assert.ok(parsedJs.emitted.some(d => d.name === 'nested'), 'nested if declaration must be emitted');

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.a, 4n);
assert.equal(jsModule.b, 5n);
assert.equal(jsModule.nested, 2n);
assert.equal(jsModule.spacedAppCondition, 5n);
assert.equal(jsModule.choose(true)(8n)(9n), 8n);
assert.equal(jsModule.choose(false)(8n)(9n), 9n);

const builtTs = runPslive(['build-ts', source, '--out', tsOut, '--json']);
const parsedTs = JSON.parse(builtTs.stdout);
assert.equal(parsedTs.status, 'accepted');
assert.equal(parsedTs.target, 'ts');

const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /\?/, 'generated TS should lower boolean if to conditional expression through checked Bool.rec semantics');
const tsc = spawnSync('tsc', [tsOut, '--target', 'ES2022', '--module', 'CommonJS', '--strict', '--skipLibCheck', '--outDir', tsOutDir], { encoding: 'utf8' });
assert.equal(tsc.status, 0, `generated TypeScript with boolean if must typecheck\nSTDOUT:\n${tsc.stdout}\nSTDERR:\n${tsc.stderr}`);
const compiled = requireFromHere(path.join(tsOutDir, 'bool-if.js'));
assert.equal(compiled.a, 4n);
assert.equal(compiled.b, 5n);
assert.equal(compiled.nested, 2n);
assert.equal(compiled.spacedAppCondition, 5n);
assert.equal(compiled.choose(true)(8n)(9n), 8n);
assert.equal(compiled.choose(false)(8n)(9n), 9n);

const natBad = path.join(dir, 'NatIfRejected.ps');
fs.writeFileSync(natBad, `def bad: Nat := { if 1 then 2 else 3 }\n`);
const rejected = runPslive(['check', natBad, '--json'], 1);
const rejection = JSON.parse(rejected.stdout);
assert.equal(rejection.status, 'rejected');
assert.match(rejection.message, /expected type Bool|literal.*expected type Bool|does not have the expected|literal only at expected type Nat/i);

console.log('PSLIVE_BOOL_IF=PASS');
