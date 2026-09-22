#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const patternSrc = path.join(root, 'packages/parser/src/patternParser.ts');
const structureTermSrc = path.join(root, 'packages/parser/src/structureTermParser.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(patternSrc), 'pattern parsing must be extracted to packages/parser/src/patternParser.ts');
assert.ok(fs.existsSync(structureTermSrc), 'structure term parsing must be extracted to packages/parser/src/structureTermParser.ts');

const pattern = fs.readFileSync(patternSrc, 'utf8');
for (const name of ['PatternParserHost', 'parsePatternFromHost', 'isReservedPatternBoundary']) {
  assert.match(pattern, new RegExp(`export (?:interface|function) ${name}\\b`), `patternParser.ts must export ${name}`);
}
assert.match(pattern, /numeric \$\{where\} pattern exceeds the supported Nat literal range/, 'patternParser.ts must preserve numeric pattern range rejection');
assert.match(pattern, /duplicate pattern binder/, 'patternParser.ts must preserve duplicate pattern-binder rejection');
assert.match(pattern, /namespacePath:host\.currentNamespace\(\)/, 'patternParser.ts must preserve namespace-path capture through the host');

const structureTerm = fs.readFileSync(structureTermSrc, 'utf8');
for (const name of ['StructureTermParserHost', 'parseStructureInstanceFromHost', 'parseStructureUpdateFieldsFromHost']) {
  assert.match(structureTerm, new RegExp(`export (?:interface|function) ${name}\\b`), `structureTermParser.ts must export ${name}`);
}
assert.match(structureTerm, /empty structure instances/, 'structureTermParser.ts must preserve empty structure instance rejection');
assert.match(structureTerm, /parenthesized structure update base requires `with`/, 'structureTermParser.ts must preserve parenthesized update-base rejection');
assert.match(structureTerm, /field punning/, 'structureTermParser.ts must keep structure field punning documented');

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/patternParser"/, 'Parser must import extracted pattern parser helpers');
assert.match(parser, /from "\.\/structureTermParser"/, 'Parser must import extracted structure term parser helpers');
assert.match(parser, /makePatternParserHost\(\)/, 'Parser must delegate pattern parsing through a narrow host object');
assert.match(parser, /makeStructureTermParserHost\(\)/, 'Parser must delegate structure term parsing through a narrow host object');
assert.doesNotMatch(parser, /private isReservedPatternBoundary\(/, 'Parser must not keep inline pattern-boundary helper');
assert.doesNotMatch(parser, /private parseStructureUpdateFields\(/, 'Parser must not keep inline structure update fields parser');

const { parseSource } = require('../packages/parser/dist/index.js');

const parsed = parseSource(`
structure Point { x: Nat; y: Nat; }
def p: Point := { {x := 1, y := 2} };
def px: Nat := { p.x };
def p2: Point := { {p with x := 3} };
def p3: Point := { {(p2) with y := 4} };
def unpack: Nat := { match(p3) { | Point.mk x y => x } };
def eqn(n: Nat): Nat
| 0 => 1
| Nat.succ k => k
| _ => 9;
`);
assert.equal(parsed.declarations.length, 7);
assert.equal(parsed.declarations[1].value.tag, 'structInst', 'structure literal must still parse');
assert.equal(parsed.declarations[3].value.tag, 'structUpdate', 'simple structure update must still parse');
assert.equal(parsed.declarations[4].value.tag, 'structUpdate', 'parenthesized structure update base must still parse');
assert.equal(parsed.declarations[5].value.tag, 'match', 'match term must still parse');
assert.equal(parsed.declarations[6].kind, 'equationDefinition', 'equation clauses must still parse');
assert.equal(parsed.declarations[6].equations[1].pattern.tag, 'ctor');

assert.throws(
  () => parseSource('def bad(n: Nat): Nat | Nat.succ k k => k;'),
  /duplicate pattern binder 'k'/,
  'duplicate pattern binder rejection must remain behavior-preserving'
);
assert.throws(
  () => parseSource('def bad: Nat := { {} };'),
  /empty structure instances/,
  'empty structure instance rejection must remain behavior-preserving'
);
assert.throws(
  () => parseSource('def bad: Nat := { {(x)} };'),
  /parenthesized structure update base requires `with`/,
  'parenthesized update-base rejection must remain behavior-preserving'
);

console.log('parser pattern/structure extraction tests: PASS');
