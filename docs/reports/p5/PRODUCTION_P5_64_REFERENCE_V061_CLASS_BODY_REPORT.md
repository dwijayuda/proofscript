# Production P5.64 Reference v0.6.1 Class Body Report

P5.64 continues PSC-1 conformance against the v0.6.1 compiler-ready language reference. It adds supported evidence for braced class bodies after `where`, including explicit class parameters and function-valued fields:

```proofscript
class Sized(A : Type) where {
  size : A -> Nat;
}

instance sizedNat : Sized(Nat) := { size := fun (n : Nat) => n + 1 };
const natResult : Nat := Sized.size(Nat, sizedNat, 6);
```

## TDD evidence

The focused test `tools/pslive-reference-v061-class-body-tests.ts` was written first. On the P5.63 baseline it failed red with:

```text
constant Sized.rec has no implemented type
```

After the implementation, the same focused test passes and checks parsing, Core checking, theorem/rfl smoke, JavaScript execution, TypeScript generation/compilation, and negative fail-closed behavior.

## Implementation

- `packages/elaborator/src/classElaborator.ts` now emits generated class field projections through the trusted raw `proj` Core term rather than depending on the conservative simple recursor synthesizer.
- `packages/backend-typescript/src/declarationAnalysis.ts` records parameterized projection metadata for single-constructor, indexless class/structure-like inductives.
- `packages/backend-typescript/src/termEmitter.ts` erases explicit projection type parameters for direct projection applications before emitting runtime field projection.
- `packages/backend-typescript/src/moduleEmitter.ts` emits standalone projection functions with erased parameter binders for exported projection declarations.

## Deferred / fail-closed neighbors

Class method binder sugar, class `extends`, empty classes, hidden/implicit class fields in the body, dependent classes beyond the existing explicit-parameter slice, and full Lean class elaboration remain unsupported or deferred.

## Trust boundary

No kernel source changed. P5.64 remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.
