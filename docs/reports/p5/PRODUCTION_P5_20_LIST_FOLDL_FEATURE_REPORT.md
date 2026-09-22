# Production P5.20 List.foldl Feature Report

P5.20 adds explicit `List.foldl(A, B, f, init, xs)` to the PSC-1 controlled-feature path. It is intentionally bounded: folding reduces only for checked finite `List(A)` constructor payloads and already-checked curried functions.

## Supported syntax

- `List.foldl(Nat, Nat, addStep, 0, xs)`
- `List.foldl(Nat, Bool, parityStep, false, xs)`

## Checked story

The checked bootstrap declares `List.foldl`. Source applications elaborate to ordinary Core applications. The K3-TB kernel validates the full constant application before bounded primitive reduction over finite constructor-shaped List payloads. JS/TypeScript emission uses `List_foldl` only after Core checking.

## Non-claims

P5.20 is not full Lean List semantics, not Foldable/typeclass support, not generalized recursion over arbitrary lists, and not a formal Lean 4 equivalence proof. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Evidence

Focused feature test: `tools/pslive-list-foldl-tests.ts`.
Controlled release gate: `tools/verify-p5-controlled-release.ts`.
