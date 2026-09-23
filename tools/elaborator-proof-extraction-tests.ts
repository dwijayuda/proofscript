#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const proofSrc = path.join(root, 'packages/elaborator/src/proofElaborator.ts');
const elaboratorSrc = path.join(root, 'packages/elaborator/src/index.ts');
const termElaborationSrc = path.join(root, 'packages/elaborator/src/termElaboration.ts');

assert.ok(fs.existsSync(proofSrc), 'proof elaboration must be extracted to packages/elaborator/src/proofElaborator.ts');
const proof = fs.readFileSync(proofSrc, 'utf8');
for (const name of ['ProofElaborationHost', 'elabProofTerm']) {
  assert.match(proof, new RegExp(`export (?:interface|function) ${name}\\b`), `proofElaborator.ts must export ${name}`);
}
for (const helper of ['elabRflProof', 'elabExactProof', 'elabAssumptionProof', 'elabApplyProof', 'elabIntroProof', 'elabShowProof', 'elabHaveProof']) {
  assert.match(proof, new RegExp(`function ${helper}\\b`), `proofElaborator.ts must own ${helper}`);
}
assert.match(proof, /Eq\.refl/, 'proofElaborator.ts must own rfl Eq.refl construction');
assert.match(proof, /apply failed: supplied term/, 'proofElaborator.ts must preserve apply rejection wording');

const index = fs.readFileSync(elaboratorSrc, 'utf8') + '\n' + fs.readFileSync(termElaborationSrc, 'utf8');
assert.match(index, /from "\.\/proofElaborator"/, 'term dispatcher must import the extracted proof elaborator');
assert.match(index, /elabProofTerm\(/, 'term dispatcher must delegate proof terms to elabProofTerm');
assert.doesNotMatch(index, /function elabRflProof\(/, 'elaborator index must not keep inline elabRflProof');
assert.doesNotMatch(index, /function elabIntroProof\(/, 'elaborator index must not keep inline elabIntroProof');
assert.doesNotMatch(index, /function elabApplyProof\(/, 'elaborator index must not keep inline elabApplyProof');

const fixture = createPsliveFixture('proofscript-elab-proof-extraction-', {
  source: `
function idNat(x: Nat): Nat := { x }
theorem idNat_rfl: idNat 3 = 3 := by rfl

theorem exact_rfl: 4 = 4 := by exact rfl

axiom P: Prop;
axiom Q: Prop;

theorem intro_assumption: P -> P := by { intro h; assumption }

theorem apply_exact(h: P): P := by { apply h }

theorem apply_subgoal(h: P -> Q, hp: P): Q := by { apply h; assumption }

theorem show_exact(h: P): P := by { show P; exact h }

theorem have_exact(h: P): P := by { have hp : P := h; exact hp }

theorem have_inferred(h: P): P := by { have hp := h; exact hp }

theorem have_nested(h: P): P := by { have hp : P := by { exact h }; show P; exact hp }

theorem have_dependent_target(n: Nat, h: n = n): n = n := by { have hn : n = n := h; exact h }

def executable: Nat := { idNat 9 }
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
for (const name of ['idNat_rfl', 'exact_rfl', 'intro_assumption', 'apply_exact', 'apply_subgoal', 'show_exact', 'have_exact', 'have_inferred', 'have_nested', 'have_dependent_target']) {
  assert.ok(checked.userDeclarations.some(d => d.name === name && d.kind === 'theorem'), `expected theorem ${name}`);
}
const built = buildJsFixture(fixture, 'proof-elab.js');
assert.ok(built.result.skipped.some(d => d.name === 'idNat_rfl' && d.reason === 'non-executable declaration'));
const mod = requireFixtureModule(built.outPath);
assert.equal(mod.executable, 9n);

const bad = fixture.write('BadProof.ps', 'theorem bad: 1 = 2 := by rfl\n');
const rejected = runPsliveJson(['check', bad, '--json'], 1);
assert.equal(rejected.status, 'rejected');
assert.match(rejected.message, /rfl|definitionally equal|equality sides/i);

const badShow = fixture.write('BadShow.ps', `
axiom P: Prop;
axiom Q: Prop;
theorem bad_show(h: P): P := by { show Q; exact h }
`);
const rejectedShow = runPsliveJson(['check', badShow, '--json'], 1);
assert.equal(rejectedShow.status, 'rejected');
assert.match(rejectedShow.message, /show failed|definitionally equal|current goal/i);

const badHave = fixture.write('BadHave.ps', `
axiom P: Prop;
axiom Q: Prop;
theorem bad_have(h: P): P := by { have hq : Q := h; exact h }
`);
const rejectedHave = runPsliveJson(['check', badHave, '--json'], 1);
assert.equal(rejectedHave.status, 'rejected');
assert.match(rejectedHave.message, /have failed|declared hypothesis type|expected/i);

console.log('ELABORATOR_PROOF_EXTRACTION=PASS');
