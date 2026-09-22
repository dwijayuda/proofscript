# Production P4.60 — User Inductive Match Runtime

## Status

Trusted-boundary implementation evidence only. Not a formal Lean 4 equivalence proof.

## Feature

P4.60 adds executable JavaScript backend/runtime support for checked matches over nonrecursive, parameterless/indexless, multi-constructor user inductives. The runtime uses the same frozen tagged-record representation already used by PSC-1 structure values.

Supported examples:

```proofscript
inductive Color: Type where { | red | green | blue }

function colorCode(c: Color): Nat := {
  match (c) {
    | Color.red => 1
    | Color.green => 2
    | Color.blue => 3
  }
}

inductive MaybeNat: Type where { | none | some (value: Nat) }

function maybeDefault(m: MaybeNat): Nat := {
  match (m) {
    | MaybeNat.none => 0
    | MaybeNat.some value => value
  }
}
```

## Implementation

- `packages/backend-typescript/src/index.ts` now collects nonrecursive parameterless/indexless recursors for user inductives.
- Multi-constructor recursor applications emit `__ps.Inductive_rec(owner, arities)(branches)(scrutinee)`.
- Existing one-constructor structure recursor emission is preserved through `Struct_rec`.
- Recursive user inductive recursors remain unsupported/fail-closed for JS emission.

## Runtime checks

`Inductive_rec` validates:

- inductive owner tag,
- constructor index range,
- field arity,
- branch count,
- fully curried branch application.

## TDD evidence

RED: `npm run test:user-inductive-match-runtime` failed because the runtime feature manifest did not list multi-constructor user-inductive match runtime support, and before implementation the backend rejected `Color.rec`/`MaybeNat.rec` emission.

GREEN: `USER_INDUCTIVE_MATCH_RUNTIME=PASS`; Color red/green/blue and MaybeNat none/some execute correctly. Recursive user-inductive match emission rejects.

## Boundary

This is not full Lean match compilation. Parameters, indices, dependent motives at runtime, recursive/mutual/nested inductives, typeclass/macro-driven elaboration, and unchecked JavaScript union interop remain unsupported/fail-closed.
