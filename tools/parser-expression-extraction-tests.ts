#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const expressionSrc = path.join(root, 'packages/parser/src/expressionParser.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(expressionSrc), 'expression parsing must be extracted to packages/parser/src/expressionParser.ts');

const expression = fs.readFileSync(expressionSrc, 'utf8');
for (const name of ['ExpressionParserHost', 'parseTermFromHost', 'looksLikeArrowOnlyLambda', 'canStartJuxtaposedArgument']) {
  assert.match(expression, new RegExp(`export (?:interface|function) ${name}\\b`), `expressionParser.ts must export ${name}`);
}
for (const helper of ['parseArrow', 'parseEquality', 'parseBoolOr', 'parseBoolAnd', 'parseNatComparison', 'parseNatAddition', 'parseNatMultiplication', 'parsePostfix', 'parseCallPostfix']) {
  assert.match(expression, new RegExp(`function ${helper}\\b`), `expressionParser.ts must own ${helper}`);
}
assert.match(expression, /makeBoolOr/, 'expressionParser.ts must own Boolean operator sugar lowering');
assert.match(expression, /makeNatMul/, 'expressionParser.ts must own Nat multiplication sugar lowering');
assert.match(expression, /makeNatSub/, 'expressionParser.ts must own Nat subtraction sugar lowering');
assert.match(expression, /makeNatBeq/, 'expressionParser.ts must own Nat Boolean equality sugar lowering');
assert.match(expression, /makeNatLeb/, 'expressionParser.ts must own Nat <= sugar lowering');
assert.match(expression, /makeNatLtb/, 'expressionParser.ts must own Nat < sugar lowering');
assert.match(expression, /chained propositional equality requires parentheses/, 'expressionParser.ts must preserve equality chaining rejection');
assert.match(expression, /explicit application '@' currently requires a following argument list/, 'expressionParser.ts must preserve explicit-application rejection');

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/expressionParser"/, 'Parser must import extracted expression parser helpers');
assert.match(parser, /makeExpressionParserHost\(\)/, 'Parser must delegate expression parsing through a narrow host object');
assert.doesNotMatch(parser, /private parseArrow\(/, 'Parser must not keep inline parseArrow');
assert.doesNotMatch(parser, /private parseEquality\(/, 'Parser must not keep inline parseEquality');
assert.doesNotMatch(parser, /private parseBoolOr\(/, 'Parser must not keep inline parseBoolOr');
assert.doesNotMatch(parser, /private parseCallPostfix\(/, 'Parser must not keep inline parseCallPostfix');

const { parseSource } = require('../packages/parser/dist/index.js');

const parsed = parseSource(`
function addTwo(x: Nat): Nat := { x + 2 };
function complex(a: Bool, b: Bool, x: Nat): Nat := { if a || b && false then Nat.add x (8 - 2 * 3) else addTwo x };
theorem complex_eq: complex true false 1 = 3 := by rfl
`);
assert.equal(parsed.declarations.length, 3);
assert.equal(parsed.declarations[0].value.tag, 'app', 'Nat addition sugar should still lower to an application');
assert.equal(parsed.declarations[1].value.tag, 'bif', 'if syntax should still lower to bif');
assert.equal(parsed.declarations[2].value.tag, 'rflProof', 'direct by proof sugar must still parse');

assert.throws(
  () => parseSource('theorem bad: 1 = 1 = 1 := by rfl'),
  /chained propositional equality requires parentheses/,
  'chained equality rejection must remain behavior-preserving'
);
assert.throws(
  () => parseSource('def bad: Nat := { @Nat.succ };'),
  /explicit application '@' currently requires a following argument list/,
  'bare explicit application rejection must remain behavior-preserving'
);
assert.throws(
  () => parseSource('function bad(x: Nat): Nat := { (y: Nat) => y };'),
  /arrow-only lambda syntax/,
  'arrow-only lambda rejection must remain behavior-preserving'
);

console.log('parser expression extraction tests: PASS');
