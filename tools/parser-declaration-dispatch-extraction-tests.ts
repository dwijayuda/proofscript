#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const declSrc = path.join(root, 'packages/parser/src/declarationParser.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(declSrc), 'parser declaration dispatch must be extracted to packages/parser/src/declarationParser.ts');
const decl = fs.readFileSync(declSrc, 'utf8');
assert.match(decl, /export interface DeclarationParserHost\b/, 'declarationParser.ts must define a narrow host interface');
assert.match(decl, /export function parseDeclaration\b/, 'declarationParser.ts must export parseDeclaration');
for (const method of [
  'parseInductiveDeclaration',
  'parseStructureDeclaration',
  'parseClassDeclaration',
  'parseInstanceDeclaration',
  'parseDefinition',
  'parseFunctionAliasDeclaration',
  'parseConstAliasDeclaration',
  'parseTransparentLikeDeclaration',
  'parseExampleDeclaration',
  'parseTheoremOrAxiomDeclaration'
]) {
  assert.match(decl, new RegExp(`${method}\\(`), `declarationParser.ts must dispatch ${method}`);
}

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/declarationParser"/, 'parser must import the extracted declaration dispatcher');
assert.doesNotMatch(parser, /private parseDeclaration\(/, 'Parser must not keep inline parseDeclaration dispatcher');
assert.match(parser, /parseDeclaration\(\{/, 'Parser must delegate declaration dispatch through a host object');

const { parseSource } = require('../packages/parser/dist/index.js');
const parsed = parseSource(`
structure Point { x: Nat; y: Nat; }
def p: Point := { { x := 1, y := 2 } };
function getX(q: Point): Nat := { q.x }
theorem getX_p_eq: getX p = 1 := by rfl
`);
assert.equal(parsed.declarations.length, 4);
assert.equal(parsed.declarations[0].kind, 'structure');
assert.equal(parsed.declarations[1].kind, 'definition');
assert.equal(parsed.declarations[2].kind, 'definition');
assert.equal(parsed.declarations[3].kind, 'theorem');

console.log('parser declaration dispatch extraction tests: PASS');
