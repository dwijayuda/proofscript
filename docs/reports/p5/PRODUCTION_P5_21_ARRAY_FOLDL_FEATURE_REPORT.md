# Production P5.21 Array.foldl Feature Report

P5.21 adds explicit `Array.foldl(A, B, f, init, xs)` to the PSC-1 controlled-feature path. It is intentionally bounded: folding reduces only for checked finite `Array.mk(A, List(A))` payloads and already-checked curried functions.

## Supported source shape

- `Array.foldl(Nat, Nat, addStep, 0, xs)`
- `Array.foldl(Nat, Bool, parityStep, false, xs)`

## Checked architecture

`Array.foldl` is a checked bootstrap declaration. Source applications elaborate to ordinary Core applications. The K3-TB kernel validates the full constant application before bounded primitive reduction over finite Array payloads by reading the checked `Array.mk` List backing value. JS/TypeScript emission uses `Array_foldl` only after Core checking.

## Non-claims

P5.21 is not full Lean Array semantics, not Foldable/typeclass support, not generalized recursion over arbitrary arrays, and not a formal Lean 4 equivalence proof. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Focused feature test: `tools/pslive-array-foldl-tests.ts`.
Controlled release gate: `tools/verify-p5-controlled-release.ts`.
Companion conformance: `tools/conformance-runner.ts`.
