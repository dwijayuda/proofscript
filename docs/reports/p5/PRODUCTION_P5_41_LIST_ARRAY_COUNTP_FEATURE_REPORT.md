# Production P5.41 List.countP / Array.countP Feature Report

## Summary

P5.41 adds explicit `List.countP(A, p, xs): Nat` and `Array.countP(A, p, xs): Nat` calls to the controlled PSC-1 path. This is a compact continuation of the finite collection features added through P5.40.

The predicate must type-check as `A -> Bool`. Inputs must type-check as `List(A)` or `Array(A)` and reduce to finite checked List constructor payloads or `Array.mk(A, data)` payloads backed by finite checked Lists. Primitive reduction counts exactly the checked elements whose predicate reduces to `Bool.true` and returns a checked `Nat` literal.

## Implementation path

- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps`
- Checked Core artifact: `packages/std/core/bootstrap.pscore.json`
- K3-TB primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`
- JS/TypeScript emission routing: `packages/backend-typescript/src/termEmitter.ts`
- Runtime helpers after Core checking: `packages/runtime/src/source.ts`
- Focused smoke test: `tools/pslive-list-array-countp-tests.ts`
- Bootstrap/kernel reduction smoke: `tools/k1d-foundation-tests.ts`

## Verified behavior

- Mixed predicate matches count to the expected `Nat`.
- All-matching payload counts all elements.
- No-matching payload returns `0`.
- Empty payload returns `0`.
- JS emission executes.
- TypeScript emission compiles and executes.
- `by rfl` reduction witnesses the bounded primitive computation.
- Bad predicate result type is rejected.
- Bad List/Array argument shape is rejected.
- Bad expected result type is rejected.

## Non-claims

P5.41 does not claim full Lean `List.countP` or Array-library equivalence, no typeclass collection abstraction, no theorem library about `countP`, no fully formal K3, and no full Lean 4 equivalence. This remains K3-TB trusted-boundary evidence only. Formal Lean 4 equivalence proven obligations remain exactly 0.
