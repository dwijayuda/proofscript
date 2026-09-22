#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const matchSrc = path.join(root, 'packages/elaborator/src/matchElaborator.ts');
const indexSrc = path.join(root, 'packages/elaborator/src/index.ts');
const termElaborationSrc = path.join(root, 'packages/elaborator/src/termElaboration.ts');

assert.ok(fs.existsSync(matchSrc), 'match elaboration must be extracted to packages/elaborator/src/matchElaborator.ts');
const match = fs.readFileSync(matchSrc, 'utf8');
for (const name of ['MatchElaborationHost', 'elaborateMatchTerm']) {
  assert.match(match, new RegExp(`export (?:interface|function) ${name}\\b`), `matchElaborator.ts must export ${name}`);
}
for (const helper of ['patternNamesForRule', 'lowerNatLiteralMatch', 'resolveSurfaceCasesForRules']) {
  assert.match(match, new RegExp(`function ${helper}\\b`), `matchElaborator.ts must own ${helper}`);
}
assert.match(match, /non-exhaustive K2c match/, 'match exhaustiveness rejection wording must stay in extracted module');
assert.match(match, /Nat numeric-literal match/, 'Nat literal match lowering must stay in extracted module');
assert.match(match, /recursiveFields/, 'recursive-field minor/IH handling must stay in extracted module');

const index = fs.readFileSync(indexSrc, 'utf8') + '\n' + fs.readFileSync(termElaborationSrc, 'utf8');
assert.match(index, /from "\.\/matchElaborator"/, 'term dispatcher must import the extracted match elaborator');
assert.match(index, /elaborateMatchTerm\(/, 'term dispatcher must delegate match terms');
assert.doesNotMatch(index, /function lowerNatLiteralMatch\(/, 'elaborator index must not keep inline Nat literal match lowering');
assert.doesNotMatch(index, /function resolveSurfaceCasesForRules\(/, 'elaborator index must not keep inline case-to-rule resolution');
assert.doesNotMatch(index, /const recEntry = kernelEnv\.get\(`\$\{typeHead\.name\}\.rec`\)/, 'elaborator index must not keep inline recursor-driven match lowering');

const fixture = createPsliveFixture('proofscript-elab-match-extraction-', {
  source: `
inductive MaybeNat: Type where {
  | none
  | some(value: Nat)
}

def choose(m: MaybeNat): Nat := {
  match (m) {
    | none => 0
    | some x => x
  }
}

def chosenSome: Nat := { choose (some 8) }
def chosenNone: Nat := { choose none }

def fromNat(n: Nat): Nat := {
  match (n) {
    | 0 => 10
    | 2 => 20
    | _ => 99
  }
}

def fromZero: Nat := { fromNat 0 }
def fromTwo: Nat := { fromNat 2 }
def fromOther: Nat := { fromNat 5 }

theorem chosen_some_rfl: chosenSome = 8 := by rfl
theorem chosen_none_rfl: chosenNone = 0 := by rfl
theorem from_zero_rfl: fromZero = 10 := by rfl
theorem from_two_rfl: fromTwo = 20 := by rfl
theorem from_other_rfl: fromOther = 99 := by rfl
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
for (const name of ['choose', 'chosen_some_rfl', 'chosen_none_rfl', 'from_two_rfl', 'from_other_rfl']) {
  assert.ok(checked.userDeclarations.some(d => d.name === name), `expected declaration ${name}`);
}
const built = buildJsFixture(fixture, 'match-extraction.js');
const mod = requireFixtureModule(built.outPath);
assert.equal(mod.chosenSome, 8n);
assert.equal(mod.chosenNone, 0n);
assert.equal(mod.fromZero, 10n);
assert.equal(mod.fromTwo, 20n);
assert.equal(mod.fromOther, 99n);

const bad = fixture.write('BadMatch.ps', `
inductive Tiny: Type where {
  | a
  | b
}

def bad(t: Tiny): Nat := {
  match (t) {
    | a => 1
  }
}
`);
const rejected = runPsliveJson(['check', bad, '--json'], 1);
assert.equal(rejected.status, 'rejected');
assert.match(rejected.message, /non-exhaustive K2c match|missing/i);

console.log('ELABORATOR_MATCH_EXTRACTION=PASS');
