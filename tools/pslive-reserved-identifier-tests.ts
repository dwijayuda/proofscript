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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-reserved-identifiers-'));
const source = path.join(dir, 'ReservedIdentifiers.ps');
const jsOut = path.join(dir, 'reserved.js');
const tsOut = path.join(dir, 'reserved.ts');
const jsOutDir = path.join(dir, 'compiled');

fs.writeFileSync(source, `
def default: Nat := { 1 }
def class: Nat := { 2 }
def __ps: Nat := { 3 }
def require: Nat := { 4 }
def total: Nat := { Nat.add(default, Nat.add(class, Nat.add(__ps, require))) }
`);

const builtJs = runPslive(['build-js', source, '--out', jsOut, '--json']);
const parsedJs = JSON.parse(builtJs.stdout);
assert.equal(parsedJs.status, 'accepted');
assert.equal(parsedJs.target, 'js');
assert.ok(parsedJs.emitted.some(d => d.name === 'default' && d.jsName !== 'default'), 'reserved JS name default must be mapped to a safe binding');
assert.ok(parsedJs.emitted.some(d => d.name === 'class' && d.jsName !== 'class'), 'reserved JS name class must be mapped to a safe binding');
assert.ok(parsedJs.emitted.some(d => d.name === '__ps' && d.jsName !== '__ps'), 'runtime internal __ps must be mapped to a safe binding');
assert.ok(parsedJs.emitted.some(d => d.name === 'require' && d.jsName !== 'require'), 'CommonJS wrapper name require must be mapped to a safe binding');

const jsSource = fs.readFileSync(jsOut, 'utf8');
assert.doesNotMatch(jsSource, /const default\b/);
assert.doesNotMatch(jsSource, /const class\b/);
assert.equal((jsSource.match(/const __ps\s*=/g) || []).length, 1, 'only the runtime may bind __ps');
assert.doesNotMatch(jsSource, /const require\b/);

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.default, 1n);
assert.equal(jsModule.class, 2n);
assert.equal(jsModule.__ps, 3n);
assert.equal(jsModule.require, 4n);
assert.equal(jsModule.total, 10n);
assert.equal(jsModule.__proofscript.requiresLean4, false);

const builtTs = runPslive(['build-ts', source, '--out', tsOut, '--json']);
const parsedTs = JSON.parse(builtTs.stdout);
assert.equal(parsedTs.status, 'accepted');
assert.equal(parsedTs.target, 'ts');
assert.ok(parsedTs.emitted.some(d => d.name === 'default' && d.jsName !== 'default'), 'reserved TS name default must be mapped to a safe binding');
assert.ok(parsedTs.emitted.some(d => d.name === '__ps' && d.jsName !== '__ps'), 'runtime internal __ps must be mapped to a safe binding in TS');

const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.doesNotMatch(tsSource, /export const default\b/);
assert.doesNotMatch(tsSource, /export const class\b/);
assert.doesNotMatch(tsSource, /export const __ps\b/);

const tsc = spawnSync('tsc', [tsOut, '--target', 'ES2022', '--module', 'CommonJS', '--strict', '--skipLibCheck', '--outDir', jsOutDir], { encoding: 'utf8' });
assert.equal(tsc.status, 0, `generated TypeScript with reserved source identifiers must typecheck\nSTDOUT:\n${tsc.stdout}\nSTDERR:\n${tsc.stderr}`);
const compiled = requireFromHere(path.join(jsOutDir, 'reserved.js'));
assert.equal(compiled.default.default, 1n);
assert.equal(compiled.default.class, 2n);
assert.equal(compiled.default.__ps, 3n);
assert.equal(compiled.default.require, 4n);
assert.equal(compiled.default.total, 10n);
assert.equal(compiled.default.__proofscript.requiresLean4, false);

console.log('PSLIVE_RESERVED_IDENTIFIER_EMISSION=PASS');
