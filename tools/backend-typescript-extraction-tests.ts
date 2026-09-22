#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'packages/backend-typescript/src');
const required = [
  'types.ts',
  'names.ts',
  'termEmitter.ts',
  'declarationAnalysis.ts',
  'moduleEmitter.ts',
];

for (const file of required) {
  assert.ok(fs.existsSync(path.join(srcDir, file)), `expected backend extraction module ${file} to exist`);
}

const index = fs.readFileSync(path.join(srcDir, 'index.ts'), 'utf8');
assert.match(index, /export \{ emitJavaScriptModule, emitTypeScriptModule \} from "\.\/moduleEmitter";/);
assert.match(index, /export type \{[\s\S]*EmitJavaScriptOptions[\s\S]*EmitTypeScriptResult[\s\S]*\} from "\.\/types";/);
assert.ok(index.split(/\r?\n/).length <= 30, 'backend index.ts should remain a thin public API wrapper');

const moduleEmitter = fs.readFileSync(path.join(srcDir, 'moduleEmitter.ts'), 'utf8');
assert.match(moduleEmitter, /psc1RuntimeSource/);
assert.match(moduleEmitter, /emitTerm/);
assert.match(moduleEmitter, /buildSanitizedNameMap/);

const termEmitter = fs.readFileSync(path.join(srcDir, 'termEmitter.ts'), 'utf8');
assert.match(termEmitter, /export function emitTerm/);
assert.match(termEmitter, /Nat\.mul/);
assert.match(termEmitter, /Nat\.pred/);
assert.match(termEmitter, /Nat\.sub/);
assert.match(termEmitter, /Nat\.beq/);
assert.match(termEmitter, /Nat\.leb/);
assert.match(termEmitter, /Nat\.ltb/);
assert.match(termEmitter, /Bool\.rec/);

console.log(JSON.stringify({ status: 'ok', check: 'backend-typescript-extraction', modules: required }, null, 2));
