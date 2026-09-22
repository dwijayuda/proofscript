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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-by-sugar-'));
const source = path.join(dir, 'BySugar.ps');
const jsOut = path.join(dir, 'by-sugar.js');
const tsOut = path.join(dir, 'by-sugar.ts');
const tsOutDir = path.join(dir, 'compiled');

fs.writeFileSync(source, `
function addTwo(x: Nat): Nat := { x + 2 }
def seven: Nat := { addTwo 5 }
theorem seven_eq: seven = 7 := by rfl
theorem exact_seven_eq: seven = 7 := by exact rfl
`);

const checked = runPslive(['check', source, '--json']);
const checkedJson = JSON.parse(checked.stdout);
assert.equal(checkedJson.status, 'accepted');
assert.equal(checkedJson.userDeclarations.length, 4);
assert.ok(checkedJson.userDeclarations.some(d => d.name === 'seven_eq' && d.kind === 'theorem'));
assert.ok(checkedJson.userDeclarations.some(d => d.name === 'exact_seven_eq' && d.kind === 'theorem'));

const builtJs = runPslive(['build-js', source, '--out', jsOut, '--json']);
const parsedJs = JSON.parse(builtJs.stdout);
assert.equal(parsedJs.status, 'accepted');
assert.ok(parsedJs.skipped.some(d => d.name === 'seven_eq' && d.reason === 'non-executable declaration'));
assert.ok(parsedJs.skipped.some(d => d.name === 'exact_seven_eq' && d.reason === 'non-executable declaration'));

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.seven, 7n);
assert.equal(jsModule.addTwo(9n), 11n);

const builtTs = runPslive(['build-ts', source, '--out', tsOut, '--json']);
const parsedTs = JSON.parse(builtTs.stdout);
assert.equal(parsedTs.status, 'accepted');
const tsc = spawnSync('tsc', [tsOut, '--target', 'ES2022', '--module', 'CommonJS', '--strict', '--skipLibCheck', '--outDir', tsOutDir], { encoding: 'utf8' });
assert.equal(tsc.status, 0, `generated TypeScript with by sugar must typecheck\nSTDOUT:\n${tsc.stdout}\nSTDERR:\n${tsc.stderr}`);
const compiled = requireFromHere(path.join(tsOutDir, 'by-sugar.js'));
assert.equal(compiled.seven, 7n);
assert.equal(compiled.default.__proofscript.requiresLean4, false);

const bad = path.join(dir, 'BadBySugar.ps');
fs.writeFileSync(bad, `theorem bad: 1 = 2 := by rfl\n`);
const rejected = runPslive(['check', bad, '--json'], 1);
const rejection = JSON.parse(rejected.stdout);
assert.equal(rejection.status, 'rejected');
assert.match(rejection.message, /definitional equality|rfl|not definitionally equal|does not prove/i);

console.log('PSLIVE_BY_SUGAR=PASS');
