#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const proofSrc = path.join(root, 'packages/parser/src/proofParser.ts');
const parserSrc = path.join(root, 'packages/parser/src/index.ts');

assert.ok(fs.existsSync(proofSrc), 'parser proof syntax must be extracted to packages/parser/src/proofParser.ts');
const proof = fs.readFileSync(proofSrc, 'utf8');
assert.match(proof, /export interface ProofParserHost\b/, 'proofParser.ts must define the narrow host interface');
assert.match(proof, /export function parseProofTerm\b/, 'proofParser.ts must export parseProofTerm');
assert.match(proof, /function parseProofStep\b/, 'proofParser.ts must own parseProofStep implementation');
for (const form of ['rfl', 'exact', 'assumption', 'apply', 'intro']) {
  assert.match(proof, new RegExp(`atId\\("${form}"\\)`), `proofParser.ts must handle ${form}`);
}

const parser = fs.readFileSync(parserSrc, 'utf8');
assert.match(parser, /from "\.\/proofParser"/, 'parser must import the extracted proof parser');
assert.doesNotMatch(parser, /private parseProofTerm\(/, 'Parser must not keep inline parseProofTerm');
assert.doesNotMatch(parser, /private parseProofStep\(/, 'Parser must not keep inline parseProofStep');
assert.match(parser, /parseProofTerm\(\{/, 'Parser must delegate proof parsing through a narrow host object');

const { parseSource } = require('../packages/parser/dist/index.js');
const parsed = parseSource(`
def x: Nat := { 1 };
theorem x_eq: x = 1 := by rfl
example: x = 1 := by { exact rfl }
theorem x_eq_intro: (x = 1) -> x = 1 := by { intro h; exact h }
`);
assert.equal(parsed.declarations.length, 4);
assert.equal(parsed.declarations[1].value.tag, 'rflProof');
assert.equal(parsed.declarations[2].value.tag, 'rflProof');
assert.equal(parsed.declarations[3].value.tag, 'introProof');

console.log('parser proof extraction tests: PASS');
