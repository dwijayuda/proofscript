# Production P5.47 — Option.toArray / Except.toList Feature Report

## Scope

P5.47 adds two checked-bootstrap PSC-1 conversion helpers:

```proofscript
Option.toArray(A, value): Array(A)
Except.toList(E, A, value): List(A)
```

These helpers are intentionally small and explicit. They are not typeclass-driven conversions and they do not claim full Lean library equivalence.

## Checked semantics

`Option.toArray` is a checked bootstrap definition over the existing checked `Option.toList` definition and `Array.mk` constructor:

```proofscript
def Option.toArray(A: Type, value: Option(A)): Array(A) := {
  Array.mk(A, Option.toList(A, value))
}
```

`Except.toList` is a checked bootstrap definition over the existing checked `Except.toOption` and `Option.toList` definitions:

```proofscript
def Except.toList(E: Type, A: Type, value: Except(E, A)): List(A) := {
  Option.toList(A, Except.toOption(E, A, value))
}
```

Observable behavior:

- `Option.some(A, x)` converts to `Array.singleton(A, x)`.
- `Option.none(A)` converts to `Array.mk(A, List.nil(A))`.
- `Except.ok(E, A, x)` converts to `List.singleton(A, x)`.
- `Except.error(E, A, e)` converts to `List.nil(A)`.

## Trust boundary

No kernel refactor, kernel restructuring, or new kernel primitive rule is introduced. Runtime helpers are used only after Core checking.

## Evidence

Fresh checks for this milestone include:

```text
node tools/pslive-option-except-collection-convert-tests.ts
node tools/k1d-foundation-tests.ts
npm run test:architecture
npm run test:typescript-migration
npm run test:conformance
npm run test:p5:baseline
```

## Non-claims

- Not full Lean `Option` / `Except` / collection library equivalence.
- Not typeclass conversion support.
- Not fully formal K3.
- Not a formal Lean 4 equivalence proof.
