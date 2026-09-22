#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildJsFixture, buildTsFixture, compileTypeScriptFixture, createPsliveFixture, expectPsliveRejected, requireFixtureModule, runPsliveJson } from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-v061-class-body-', {
  fileName: 'ReferenceV061ClassBody.ps',
  source: `
class Sized(A : Type) where {
  size : A -> Nat;
}

structure Box where {
  value : Nat;
}

instance sizedNat : Sized(Nat) := { size := fun (n : Nat) => n + 1 };
instance sizedBox : Sized(Box) := { size := fun (b : Box) => b.value + 2 };

const natResult : Nat := Sized.size(Nat, sizedNat, 6);
const boxed : Box := { value := 40 };
const boxResult : Nat := Sized.size(Box, sizedBox, boxed);

theorem natResult_rfl : natResult = 7 := by rfl
theorem boxResult_rfl : boxResult = 42 := by rfl
`,
});

const checked = runPsliveJson(['check', fixture.source, '--std', '--json']);
assert.ok(checked.userDeclarations.some((d) => d.name === 'Sized'), 'v0.6.1 class body should check');
assert.ok(checked.userDeclarations.some((d) => d.name === 'Sized.size'), 'class projection over function field should be generated');
assert.ok(checked.userDeclarations.some((d) => d.name === 'sizedNat'), 'class instance should check');
assert.ok(checked.userDeclarations.some((d) => d.name === 'natResult'));
assert.ok(checked.userDeclarations.some((d) => d.name === 'boxResult'));

const { outPath: jsOut } = buildJsFixture(fixture, 'reference-v061-class-body.js');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.natResult, 7n);
assert.equal(jsModule.boxResult, 42n);

const { outPath: tsOut } = buildTsFixture(fixture, 'reference-v061-class-body.ts');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.natResult, 7n);
assert.equal(compiled.boxResult, 42n);

const badMethodBinderSugar = createPsliveFixture('proofscript-v061-bad-class-method-binder-', {
  fileName: 'BadClassMethodBinder.ps',
  source: `
class Sized where {
  size(x : Nat) : Nat;
}
`,
});
const rejectedMethod = expectPsliveRejected(['check', badMethodBinderSugar.source, '--std', '--json']);
assert.match(rejectedMethod.message, /class method binder sugar|explicit function type/i);

const badDuplicateField = createPsliveFixture('proofscript-v061-bad-class-duplicate-field-', {
  fileName: 'BadClassDuplicateField.ps',
  source: `
class Bad where {
  size : Nat;
  size : Nat;
}
`,
});
const rejectedDuplicate = expectPsliveRejected(['check', badDuplicateField.source, '--std', '--json']);
assert.match(rejectedDuplicate.message, /duplicate class field/i);

console.log('PSLIVE_REFERENCE_V061_CLASS_BODY=PASS');
