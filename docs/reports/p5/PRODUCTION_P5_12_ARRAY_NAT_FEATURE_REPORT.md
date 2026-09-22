# P5.12 Array(Nat) Feature Report

P5.12 adds a bounded, expected-type-directed PSC-1 `Array(Nat)` literal feature without claiming full Lean Array API coverage.

## Supported

- `Array(A)` checked bootstrap family.
- `Array.mk(A, data)` checked constructor over `List(A)`.
- `[]` and `[1, 2, 3]` when an expected `Array(A)` type is available.
- Element elaboration against the expected checked element type.
- `by rfl` theorem smoke for definitional equality over lowered array literals.
- JS and TypeScript emission through existing checked constructor encoding.
- Fail-closed rejection for missing expected Array type, wrong element type, and wrong result type.

## Non-claims

- Not full Lean Array internals.
- No indexing, mutation, push/pop, size/get, ForIn, or full library API yet.
- Not fully formal K3.
- Not proven equivalent to Lean 4.

## Verification

Focused verification is provided by `tools/pslive-array-tests.ts`, `tools/k1d-foundation-tests.ts`, and the compact P5 controlled-release gate.
