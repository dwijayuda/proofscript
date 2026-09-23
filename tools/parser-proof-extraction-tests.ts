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
for (const form of ['rfl', 'exact', 'assumption', 'apply', 'intro', 'show', 'have', 'rw', 'subst', 'constructor', 'cases', 'induction', 'simp']) {
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
axiom P: Prop;
theorem show_p(h: P): P := by { show P; exact h }
theorem have_p(h: P): P := by { have hp : P := h; exact hp }
theorem have_inferred(h: P): P := by { have hp := h; exact hp }
theorem rw_p(a: Nat, b: Nat, h: a = b): a = b := by { rw h; rfl }
theorem rw_rev(a: Nat, b: Nat, h: a = b): b = a := by { rw ← h; rfl }
theorem rw_rev_ascii(a: Nat, b: Nat, h: a = b): b = a := by { rw <- h; rfl }
theorem subst_p(a: Nat, b: Nat, h: a = b): a = b := by { subst a; rfl }
theorem constructor_p(h: P): P := by { constructor }
theorem cases_p(h: P): P := by { cases h; assumption }
theorem induction_p(n: Nat): n = n := by { induction n; rfl }
theorem simp_p(h: P): P := by { simp }
`);
assert.equal(parsed.declarations.length, 16);
assert.equal(parsed.declarations[1].value.tag, 'rflProof');
assert.equal(parsed.declarations[2].value.tag, 'rflProof');
assert.equal(parsed.declarations[3].value.tag, 'introProof');
assert.equal(parsed.declarations[5].value.tag, 'showProof');
assert.equal(parsed.declarations[6].value.tag, 'haveProof');
assert.equal(parsed.declarations[7].value.tag, 'haveProof');
assert.equal(parsed.declarations[8].value.tag, 'rwProof');
assert.equal(parsed.declarations[9].value.tag, 'rwProof');
assert.equal(parsed.declarations[10].value.tag, 'rwProof');
assert.equal(parsed.declarations[11].value.tag, 'substProof');
assert.equal(parsed.declarations[12].value.tag, 'constructorProof');
assert.equal(parsed.declarations[13].value.tag, 'casesProof');
assert.equal(parsed.declarations[14].value.tag, 'inductionProof');
assert.equal(parsed.declarations[15].value.tag, 'simpProof');

console.log('parser proof extraction tests: PASS');
