# P5.25 List.reverse / Array.reverse Feature Report

P5.25 adds explicit `List.reverse(A, xs)` and `Array.reverse(A, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are rebuilt as checked `List(A)` or `Array(A)` values.

## Supported surface

```ts
def reversedList: List(Nat) := { List.reverse(Nat, xs) }
def reversedArray: Array(Nat) := { Array.reverse(Nat, arr) }
```

## Checked story

The bootstrap declares the APIs as checked axioms with precise types. The kernel validates the full constant application before any primitive reduction fires. Reduction only reads finite constructor-shaped `List` payloads or `Array.mk(A, List(A))` payloads whose element type matches the explicit type argument. Open lists, malformed payloads, or type mismatches remain stuck or rejected by existing type checking.

## Runtime story

JavaScript and TypeScript emission call `List_reverse` and `Array_reverse` helpers only after Core checking. Runtime helpers operate on already-emitted PSC-1 struct values and are not a source of type authority.

## Verification

Focused test: `tools/pslive-list-array-reverse-tests.ts`.

Release gate: `node tools/verify-p5-controlled-release.ts`.

Companion conformance: `node tools/conformance-runner.ts`.

## Non-goals

This release does not implement full Lean `List.reverse`/`Array.reverse` library semantics, typeclass-driven collection abstractions, append/reverse theorems, or formal Lean 4 equivalence. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
