#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const cursorSrc = path.join(root, 'packages/parser/src/tokenCursor.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(cursorSrc), 'parser cursor helper must be extracted to packages/parser/src/tokenCursor.ts');
const cursor = fs.readFileSync(cursorSrc, 'utf8');
assert.match(cursor, /export class TokenCursor/, 'tokenCursor.ts must export TokenCursor');
for (const method of ['at', 'atId', 'peek', 'next', 'expect', 'expectId', 'expectKind']) {
  assert.match(cursor, new RegExp(`protected ${method}\\(`), `TokenCursor must own protected ${method}()`);
}

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /import \{TokenCursor\} from "\.\/tokenCursor";/, 'parser must import TokenCursor');
assert.match(parser, /class Parser extends TokenCursor/, 'Parser must extend TokenCursor');
assert.doesNotMatch(parser, /private at\(|private atId\(|private peek\(|private next\(|private expect\(|private expectId\(|private expectKind\(/, 'Parser must not keep inline cursor primitives');

const { parseSource } = require('../packages/parser/dist/index.js');
const parsed = parseSource('def x: Nat := { if true && false then 1 + 2 * 3 else Nat.succ 0 };\n');
assert.equal(parsed.declarations.length, 1);
assert.equal(parsed.declarations[0].kind, 'definition');

console.log('parser cursor extraction tests: PASS');
