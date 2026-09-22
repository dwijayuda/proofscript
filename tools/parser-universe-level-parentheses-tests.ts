import assert from 'node:assert/strict';
import { parseSource } from '../packages/parser/dist/index.js';

const parsed = parseSource(`
universe u, v;
def imaxOne(A: Sort (imax 1 u)): Sort u := { A }
def imaxSelf(A: Sort (imax u u)): Sort u := { A }
def maxOffset(A: Sort (max u (u + 1))): Sort (u + 1) := { A }
def maxAbsorbExplicit(A: Sort (max 1 (u + 1))): Sort (u + 1) := { A }
def maxComm(A: Sort (max u v)): Sort (max v u) := { A }
`);

assert.equal(parsed.declarations.length, 5);
console.log('PARSER_UNIVERSE_LEVEL_PARENTHESES=PASS');
