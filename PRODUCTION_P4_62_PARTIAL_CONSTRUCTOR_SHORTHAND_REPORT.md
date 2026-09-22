# Production P4.62 — Partial Constructor Shorthand for Expected Function Types

Status: accepted in the trusted-boundary PSC-1 standalone slice; not formally proven equivalent to Lean 4.

## Scope

P4.62 extends the P4.61 expected-type constructor shorthand from fully-applied constructor values such as `red` and `some(7)` to expected-function-type constructor values such as:

```proofscript
def mkSome: Nat -> MaybeNat := {
  some
}
```

The elaborator interprets the unqualified constructor name only when normal local/global resolution fails and the expected type is a nondependent function type whose codomain is a known parameterless/indexless inductive. The partially applied constructor must infer to a type definitionally equal to the whole expected function type before it can reach JS emission.

## Implementation

Changed areas:

- `packages/elaborator/src/index.ts`
  - Added `expectedFunctionCodomainHeadForConstructorShorthand(...)`.
  - Extended `tryElabExpectedTypeConstructorShorthand(...)` to support partial constructor shorthand against expected Pi/function types.
  - Preserved fail-closed behavior for dependent expected functions and parameterized/indexed inductive targets.

- `packages/runtime/src/index.ts`
  - Manifest now advertises expected-function-type partial constructor shorthand as a checked frontend/runtime-supported slice.

- `tools/constructor-partial-shorthand-tests.ts`
  - New focused test for red/green behavior of partial constructor shorthand.

- `tools/pslive-smoke-lib.ts`
  - Added standalone-small smoke coverage for `mkSomeShort` and `fromMkSomeShortDefault`.

- `tools/reference-language-governance-smoke.ts`
  - Added reference-governed checks for acceptance, JS emission, runtime result, and wrong-codomain rejection.

- `examples/standalone-small/src/Main.ps`
  - Added user-facing example declarations and rfl theorem.

- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
  - Added `ProofScript.Frontend.Inductive.ExpectedFunctionTypePartialConstructorShorthand`.

## TDD evidence

RED before implementation:

```txt
def mkSome: Nat -> MaybeNat := { some }
=> rejected: unknown identifier: some
```

GREEN after implementation:

```txt
CONSTRUCTOR_PARTIAL_SHORTHAND=PASS
fromMkDefault => 13
```

## Boundaries

This is not full Lean constructor elaboration. P4.62 supports only unqualified constructor terms and partially applied constructor calls whose remaining inferred constructor type exactly matches a nondependent expected Pi type ending in a parameterless/indexless inductive target.

Explicitly unsupported/fail-closed:

- dependent expected function targets;
- parameterized or indexed inductive targets;
- implicit argument synthesis for constructor shorthand;
- typeclass-driven constructor resolution;
- ambiguous namespace/open resolution beyond existing PSC-1 rules;
- unchecked JavaScript enum/union construction.

## Progress estimate after P4.62

- Standalone PSC-1 without Lean4: ~95.9%
- PSC-1 small complete programming language: ~67.4%
- PSC-1 small theorem prover: ~61.2%
- Full ProofScript compiler: ~57.9%
- Full Lean-like ProofScript without Lean4: ~13.1%
- Formal Lean 4 equivalence: 0 proven obligations
