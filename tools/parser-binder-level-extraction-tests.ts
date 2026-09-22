#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const binderSrc = path.join(root, 'packages/parser/src/binderParser.ts');
const levelSrc = path.join(root, 'packages/parser/src/levelParser.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(binderSrc), 'binder parsing must be extracted to packages/parser/src/binderParser.ts');
assert.ok(fs.existsSync(levelSrc), 'universe level parsing must be extracted to packages/parser/src/levelParser.ts');

const binder = fs.readFileSync(binderSrc, 'utf8');
for (const name of ['BinderParserHost', 'canStartValueBinder', 'parseValueBinderGroup', 'parseExplicitBinderGroup', 'parseDelimitedBinderGroup']) {
  assert.match(binder, new RegExp(`export (?:interface|function) ${name}\\b`), `binderParser.ts must export ${name}`);
}
assert.match(binder, /binderInfo:"instImplicit"/, 'binderParser.ts must own instance-implicit binder construction');
assert.match(binder, /optional\/default binders/, 'binderParser.ts must preserve optional/default binder rejection');

const level = fs.readFileSync(levelSrc, 'utf8');
for (const name of ['LevelParserHost', 'canStartOptionalTypeLevel', 'parseLevel']) {
  assert.match(level, new RegExp(`export (?:interface|function) ${name}\\b`), `levelParser.ts must export ${name}`);
}
assert.match(level, /tag:"imax"/, 'levelParser.ts must preserve imax parsing');
assert.match(level, /universe successor offset/, 'levelParser.ts must preserve +n universe level parsing');

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/binderParser"/, 'Parser must import extracted binder parser helpers');
assert.match(parser, /from "\.\/levelParser"/, 'Parser must import extracted level parser helpers');
assert.doesNotMatch(parser, /private parseDelimitedBinderGroup\(/, 'Parser must not keep inline parseDelimitedBinderGroup');
assert.doesNotMatch(parser, /private levelOfNat\(/, 'Parser must not keep inline levelOfNat');
assert.match(parser, /makeBinderParserHost\(\)/, 'Parser must delegate binder parsing through a narrow host object');
assert.match(parser, /makeLevelParserHost\(\)/, 'Parser must delegate level parsing through a narrow host object');

const { parseSource } = require('../packages/parser/dist/index.js');
const parsed = parseSource(`
universe u, v;
axiom poly {A: Type u} [inst: A] : A;
function idNat(x: Nat): Nat := { x };
theorem idNat_eq: idNat 3 = 3 := by rfl
`);
assert.equal(parsed.declarations.length, 3);
assert.equal(parsed.finalState.universeParams.includes('u'), true);
assert.equal(parsed.finalState.universeParams.includes('v'), true);
assert.equal(parsed.declarations[0].binders[0].binderInfo, 'implicit');
assert.equal(parsed.declarations[0].binders[1].binderInfo, 'instImplicit');
assert.equal(parsed.declarations[1].binders[0].binderInfo, 'explicit');
assert.equal(parsed.declarations[2].value.tag, 'rflProof');

assert.throws(
  () => parseSource('function bad(x: Nat := 0): Nat := { x };'),
  /optional\/default binders/,
  'optional/default binder rejection must remain behavior-preserving'
);
assert.throws(
  () => parseSource('def bad: Sort w := { Type };'),
  /expected universe level/,
  'unknown universe parameters must still be rejected by level parser'
);

console.log('parser binder/level extraction tests: PASS');
