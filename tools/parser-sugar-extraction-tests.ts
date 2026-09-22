#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const sugarSrc = path.join(root, 'packages/parser/src/sugar.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(sugarSrc), 'parser syntax sugar constructors must be extracted to packages/parser/src/sugar.ts');
const sugar = fs.readFileSync(sugarSrc, 'utf8');
for (const name of ['makeNatAdd', 'makeNatMul', 'makeNatSub', 'makeBoolAnd', 'makeBoolOr', 'makeBoolIf', 'makeApp']) {
  assert.match(sugar, new RegExp(`export function ${name}\\b`), `sugar.ts must export ${name}`);
}

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/sugar"/, 'parser must import sugar helpers');
assert.doesNotMatch(parser, /name:"Nat\.add"/, 'parser must not inline Nat.add lowering');
assert.doesNotMatch(parser, /name:"Nat\.mul"/, 'parser must not inline Nat.mul lowering');
assert.doesNotMatch(parser, /name:"Nat\.sub"/, 'parser must not inline Nat.sub lowering');
assert.doesNotMatch(parser, /tag:"bif",condition:term,thenBranch:\{tag:"boolLit",value:true\},elseBranch:rhs/, 'parser must not inline || lowering');
assert.doesNotMatch(parser, /tag:"bif",condition:term,thenBranch:rhs,elseBranch:\{tag:"boolLit",value:false\}/, 'parser must not inline && lowering');

const { parseSource } = require('../packages/parser/dist/index.js');
const parsed = parseSource(`
function f(x: Nat): Nat := { Nat.add x 2 };
def n: Nat := { if true && false || true then 8 - 2 * 3 else f 4 };
theorem n_eq: n = 2 := by rfl
`);
assert.equal(parsed.declarations.length, 3);
const body = parsed.declarations[1].value;
assert.equal(body.tag, 'bif');
assert.equal(body.thenBranch.tag, 'app');
assert.equal(body.thenBranch.fn.name, 'Nat.sub');
assert.equal(body.thenBranch.args[1].tag, 'app');
assert.equal(body.thenBranch.args[1].fn.name, 'Nat.mul');

console.log('parser sugar extraction tests: PASS');
