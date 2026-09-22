#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-js-name-collision-'));
const source = path.join(dir, 'Collision.ps');
const jsOut = path.join(dir, 'collision.js');

fs.writeFileSync(source, `
namespace A { def B: Nat := { 1 } }
def A_B: Nat := { 2 }
`);

const run = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', source, '--out', jsOut, '--json'], {
  cwd: root,
  encoding: 'utf8',
});

assert.equal(run.status, 1, `build-js must reject sanitized JS name collisions before writing invalid/ambiguous output\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`);
const parsed = JSON.parse(run.stdout);
assert.equal(parsed.status, 'rejected');
assert.match(parsed.message, /unsupported JavaScript emission: sanitized name collision at 'A_B' -> 'A_B'/);
assert.equal(fs.existsSync(jsOut), false, 'rejected build-js must not write an output file');

console.log('PSLIVE_JS_NAME_COLLISION=PASS');
