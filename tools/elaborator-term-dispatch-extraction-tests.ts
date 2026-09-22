#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const indexSrc = path.join(root, 'packages/elaborator/src/index.ts');
const termSrc = path.join(root, 'packages/elaborator/src/termElaboration.ts');
assert.ok(fs.existsSync(termSrc), 'recursive term dispatcher must be extracted to packages/elaborator/src/termElaboration.ts');
const index = fs.readFileSync(indexSrc, 'utf8');
const term = fs.readFileSync(termSrc, 'utf8');
assert.match(index, /elaborateProgramCore\(decls, initialGlobals, initialDeclarations, initialTypeclasses, elabTerm\)/, 'index must wire public program elaboration to the extracted term dispatcher');
assert.doesNotMatch(index, /switch \(term\.tag\)/, 'index.ts must not keep the recursive SurfaceTerm dispatcher switch');
for (const delegate of ['elabProofTerm', 'elaborateMatchTerm', 'elabArrayLiteral', 'elabDo', 'elabBif', 'elabBinaryOp', 'elabAppTerm', 'elabLambdaTerm', 'elaborateStructureInstanceCore']) {
  assert.match(term, new RegExp(`${delegate}\\b`), `termElaboration.ts must delegate through ${delegate}`);
}
assert.match(term, /export function elabTerm\b/, 'termElaboration.ts must export elabTerm');

const fixture = createPsliveFixture('proofscript-elab-term-dispatch-', {
  source: `
structure Pair where {
  left : Nat;
  right : Nat;
}

inductive MaybeNat : Type where {
  | none
  | some(value : Nat)
}

function pick(m : MaybeNat, fallback : Nat) : Nat :=
  match m with {
    | none => fallback;
    | some x => x;
  };

def p : Pair := { { left := pick(MaybeNat.some(4), 0), right := if (true) { 5 } else { 9 } } };
def result : Nat := { p.left + p.right }
theorem result_rfl : result = 9 := by rfl
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
assert.ok(checked.userDeclarations.some((d) => d.name === 'result_rfl'));
const built = buildJsFixture(fixture, 'term-dispatch.js');
const mod = requireFixtureModule(built.outPath);
assert.equal(mod.result, 9n);
console.log('ELABORATOR_TERM_DISPATCH_EXTRACTION=PASS');
