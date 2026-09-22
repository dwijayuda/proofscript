#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  buildJsCommand,
  buildTsCommand,
  checkCommand,
  getStatusResult,
  parseRunArg,
  printableRunValue,
  runSmallSource,
} from './pslive-core.ts';

const status = getStatusResult();
assert.equal(status.requiresLean4, false);
assert.equal(status.status, 'live-small-subset');
assert.match(status.trustLabel, /trusted-boundary standalone small subset/);

assert.equal(parseRunArg('true'), true);
assert.equal(parseRunArg('false'), false);
assert.equal(parseRunArg('42'), 42n);
assert.equal(printableRunValue(42n), '42');
assert.equal(printableRunValue(false), 'false');
assert.throws(() => parseRunArg('1.5'), /unsupported PSC-1 run argument/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proofscript-pslive-core-'));
const source = path.join(dir, 'CoreApi.ps');
const coreOut = path.join(dir, 'artifact.pscore.json');
const jsOut = path.join(dir, 'core-api.js');
const tsOut = path.join(dir, 'core-api.ts');

fs.writeFileSync(source, `
function double(x: Nat): Nat := { x * 2 }
def result: Nat := { double 3 }
theorem result_eq: result = 6 := by rfl
`);

const checked = checkCommand(source, { emitCore: coreOut });
assert.equal(checked.status, 'accepted');
assert.ok(checked.userDeclarations.some(d => d.name === 'result'));
assert.ok(fs.existsSync(coreOut), 'checkCommand should write --emit-core output');

const builtJs = buildJsCommand(source, jsOut);
assert.equal(builtJs.status, 'accepted');
assert.equal(builtJs.target, 'js');
assert.ok(builtJs.emitted.some(d => d.name === 'double'));
assert.ok(builtJs.skipped.some(d => d.name === 'result_eq'));

const requireFromHere = createRequire(import.meta.url);
const jsModule = requireFromHere(jsOut);
assert.equal(jsModule.result, 6n);
assert.equal(jsModule.double(4n), 8n);

const run = await runSmallSource(source, { call: 'double', args: ['5'] });
assert.equal(run.status, 'accepted');
assert.deepEqual(run.args, ['5']);
assert.equal(run.result, '10');

const builtTs = buildTsCommand(source, tsOut);
assert.equal(builtTs.status, 'accepted');
assert.equal(builtTs.target, 'ts');
assert.ok(fs.readFileSync(tsOut, 'utf8').includes('export const result'));

console.log('PSLIVE_CORE_EXTRACTION=PASS');
