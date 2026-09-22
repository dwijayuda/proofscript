#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createPsliveFixture, runPsliveJson, buildJsFixture, requireFixtureModule } from './pslive-test-harness.ts';

const root = process.cwd();
const extractedSrc = `${root}/packages/elaborator/src/inductiveElaborator.ts`;
const indexSrc = `${root}/packages/elaborator/src/index.ts`;
const termElaborationSrc = `${root}/packages/elaborator/src/termElaboration.ts`;
const programElaborationSrc = `${root}/packages/elaborator/src/programElaboration.ts`;

assert.ok(fs.existsSync(extractedSrc), 'structure/inductive elaboration must be extracted to packages/elaborator/src/inductiveElaborator.ts');
const extracted = fs.readFileSync(extractedSrc, 'utf8');
for (const name of ['InductiveElaborationHost', 'elaborateStructureDeclaration', 'elaborateInductiveDeclaration']) {
  assert.match(extracted, new RegExp(`export (?:interface|function) ${name}\\b`), `inductiveElaborator.ts must export ${name}`);
}
assert.match(extracted, /structure field type is not a type/, 'structure validation wording must stay in extracted module');
assert.match(extracted, /generated structure projection/, 'structure projection generation must live in extracted module');
assert.match(extracted, /elaborateConstructorType/, 'inductive constructor type elaboration must be delegated through the host');

const index = fs.readFileSync(indexSrc, 'utf8') + '\n' + fs.readFileSync(termElaborationSrc, 'utf8') + '\n' + fs.readFileSync(programElaborationSrc, 'utf8');
assert.match(index, /from "\.\/inductiveElaborator"/, 'public elaborator wiring must import the extracted structure/inductive elaborator through program elaboration');
assert.match(index, /elaborateStructureDeclaration\(/, 'program elaboration must delegate structure declarations');
assert.match(index, /elaborateInductiveDeclaration\(/, 'program elaboration must delegate inductive declarations');
assert.doesNotMatch(index, /if \(decl\.kind === "structure"\) \{\s*const fields = decl\.fields\.map/s, 'elaborator index must not keep the inline structure block');
assert.doesNotMatch(index, /if \(decl\.kind === "inductive"\) \{\s*const type = elabTelescopeType/s, 'elaborator index must not keep the inline inductive block');

const fixture = createPsliveFixture('proofscript-elab-inductive-structure-extraction-', {
  source: `
structure Pair where {
  left: Nat;
  right: Nat;
}

def p: Pair := { { left := 2, right := 5 } }
def leftOfP: Nat := { p.left }
def updated: Pair := { { p with right := 7 } }
def updatedRight: Nat := { updated.right }

theorem left_rfl: leftOfP = 2 := by rfl
theorem update_rfl: updatedRight = 7 := by rfl

inductive MaybeNat: Type where {
  | none
  | some(value: Nat)
}

def chosen(m: MaybeNat): Nat := {
  match (m) {
    | none => 0
    | some x => x
  }
}

def chosenSome: Nat := { chosen (some 9) }
theorem chosen_some_rfl: chosenSome = 9 := by rfl
`,
});
const checked = runPsliveJson(['check', fixture.source, '--json']);
assert.equal(checked.status, 'accepted');
for (const name of ['Pair', 'Pair.left', 'Pair.right', 'MaybeNat', 'left_rfl', 'update_rfl', 'chosen_some_rfl']) {
  assert.ok(checked.userDeclarations.some(d => d.name === name), `expected declaration ${name}`);
}
const built = buildJsFixture(fixture, 'inductive-structure.js');
const mod = requireFixtureModule(built.outPath);
assert.equal(mod.leftOfP, 2n);
assert.equal(mod.updatedRight, 7n);
assert.equal(mod.chosenSome, 9n);

const bad = fixture.write('BadStructure.ps', 'structure Bad where {\n  bad: 0;\n}\n');
const rejected = runPsliveJson(['check', bad, '--json'], 1);
assert.equal(rejected.status, 'rejected');
assert.match(rejected.message, /structure field type is not a type|Expected type/i);

console.log('ELABORATOR_INDUCTIVE_STRUCTURE_EXTRACTION=PASS');
