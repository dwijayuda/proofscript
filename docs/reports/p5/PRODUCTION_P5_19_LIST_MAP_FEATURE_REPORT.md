# Production P5.19 List.map Feature Report

P5.19 adds explicit `List.map(A, B, f, xs)` to the PSC-1 controlled-feature path. It is intentionally bounded: mapping reduces only for checked finite `List(A)` constructor payloads and already-checked functions.

## Supported behavior

- `List.map(Nat, Nat, inc, xs)`
- `List.map(Nat, Bool, isZero, xs)`
- empty-list mapping
- `by rfl` smoke for mapped finite lists
- JavaScript execution smoke
- TypeScript compile/run smoke
- bad mapper rejection
- wrong result type rejection

## Architecture path

The checked bootstrap declares `List.map`. Source applications elaborate to ordinary Core applications. The K3-TB kernel validates the full constant application before bounded primitive reduction over finite constructor-shaped List payloads. JS/TypeScript emission uses `List_map` only after Core checking.

## Non-claims

P5.19 is not full Lean List semantics, not Functor/typeclass support, not append/fold/filter, and not a formal Lean 4 equivalence proof. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Evidence

Focused feature test: `tools/pslive-list-map-tests.ts`.

Controlled release gate: `tools/verify-p5-controlled-release.ts`.
