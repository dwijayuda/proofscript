#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const proofSrc = path.join(root, 'packages/elaborator/src/proofElaborator.ts');
const elaboratorSrc = path.join(root, 'packages/elaborator/src/index.ts');
const termElaborationSrc = path.join(root, 'packages/elaborator/src/termElaboration.ts');
const equalityTacticsSrc = path.join(root, 'packages/elaborator/src/proofEqualityTactics.ts');
const inductiveTacticsSrc = path.join(root, 'packages/elaborator/src/proofInductiveTactics.ts');

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

const equalityTactics = fs.readFileSync(equalityTacticsSrc, 'utf8');
for (const name of ['elabRwProof', 'elabSubstProof', 'elabSimpProof']) {
  assert.match(equalityTactics, new RegExp(`export function ${name}\\b`), `proofEqualityTactics.ts must export ${name}`);
}
assert.match(equalityTactics, /Eq\.rec/, 'rw must construct checked Eq.rec transport');

const inductiveTactics = fs.readFileSync(inductiveTacticsSrc, 'utf8');
for (const name of ['elabConstructorProof', 'elabCasesProof', 'elabInductionProof']) {
  assert.match(inductiveTactics, new RegExp(`export function ${name}\\b`), `proofInductiveTactics.ts must export ${name}`);
}
assert.match(inductiveTactics, /recursor/, 'cases/induction must use checked recursor metadata');

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

theorem rw_forward(a: Nat, b: Nat, h: a = b): a = b := by { rw h; rfl }

theorem rw_reverse(a: Nat, b: Nat, h: a = b): b = a := by { rw ← h; rfl }

axiom one_eq_two: 1 = 2;
theorem rw_exact_numeral: 1 = 2 := by { rw one_eq_two; rfl }

theorem subst_forward(a: Nat, b: Nat, h: a = b): a = b := by { subst a; rfl }

inductive BothP: Prop where {
  | intro (left: P) (right: Q)
}

inductive HolderP: Prop where {
  | intro (value: P)
}

inductive ChainP: Prop where {
  | base (value: P)
  | step (tail: ChainP)
}

theorem constructor_both(hp: P, hq: Q): BothP := by { constructor; assumption }

theorem cases_bool(b: Bool): 1 = 1 := by { cases b; rfl }

theorem cases_holder(h: HolderP): P := by { cases h; assumption }

theorem induction_nat_reflexive(n: Nat): n = n := by { induction n; rfl }

theorem induction_chain(h: ChainP): P := by { induction h; assumption }

theorem simp_reflexive(n: Nat): n = n := by { simp }

theorem simp_assumption(h: P): P := by { simp }

theorem simp_rewrite(a: Nat, b: Nat, h: a = b): Nat.succ(a) = Nat.succ(b) := by { simp }

def executable: Nat := { idNat 9 }
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
for (const name of ['idNat_rfl', 'exact_rfl', 'intro_assumption', 'apply_exact', 'apply_subgoal', 'show_exact', 'have_exact', 'have_inferred', 'have_nested', 'have_dependent_target', 'rw_forward', 'rw_reverse', 'rw_exact_numeral', 'subst_forward', 'constructor_both', 'cases_bool', 'cases_holder', 'induction_nat_reflexive', 'induction_chain', 'simp_reflexive', 'simp_assumption', 'simp_rewrite']) {
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

const badRw = fixture.write('BadRw.ps', `
axiom impossible: 1 = 2;
theorem bad_rw: 3 = 3 := by { rw impossible; rfl }
`);
const rejectedRw = runPsliveJson(['check', badRw, '--json'], 1);
assert.equal(rejectedRw.status, 'rejected');
assert.match(rejectedRw.message, /rw failed|does not occur/i);

const badSubst = fixture.write('BadSubst.ps', `
theorem bad_subst(a: Nat): a = a := by { subst a; rfl }
`);
const rejectedSubst = runPsliveJson(['check', badSubst, '--json'], 1);
assert.equal(rejectedSubst.status, 'rejected');
assert.match(rejectedSubst.message, /subst failed|no local equality/i);

const badConstructor = fixture.write('BadConstructor.ps', `
inductive ChoiceP: Prop where { | left | right }
theorem bad_constructor: ChoiceP := by { constructor }
`);
const rejectedConstructor = runPsliveJson(['check', badConstructor, '--json'], 1);
assert.equal(rejectedConstructor.status, 'rejected');
assert.match(rejectedConstructor.message, /constructor currently requires exactly one constructor/i);

const badCasesRecursive = fixture.write('BadCasesRecursive.ps', `
inductive ChainP: Prop where { | base | step (tail: ChainP) }
theorem bad_cases(h: ChainP): 1 = 1 := by { cases h; rfl }
`);
const rejectedCases = runPsliveJson(['check', badCasesRecursive, '--json'], 1);
assert.equal(rejectedCases.status, 'rejected');
assert.match(rejectedCases.message, /cases currently handles nonrecursive inductives/i);

const badSimp = fixture.write('BadSimp.ps', `
axiom P: Prop;
theorem bad_simp: P := by { simp }
`);
const rejectedSimp = runPsliveJson(['check', badSimp, '--json'], 1);
assert.equal(rejectedSimp.status, 'rejected');
assert.match(rejectedSimp.message, /simp failed|bounded simp-lite/i);

console.log('ELABORATOR_PROOF_EXTRACTION=PASS');
