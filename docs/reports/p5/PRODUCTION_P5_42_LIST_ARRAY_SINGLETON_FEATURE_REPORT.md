# Production P5.42 List.singleton / Array.singleton Feature Report

## Summary

P5.42 adds explicit `List.singleton(A, value): List(A)` and `Array.singleton(A, value): Array(A)` support to the controlled PSC-1 path.

Unlike the recent finite collection helper slices, this milestone intentionally avoids adding a new kernel primitive. `List.singleton` and `Array.singleton` are checked bootstrap definitions in `packages/std/src/Bootstrap/Foundation.ps`:

- `List.singleton(A, value)` expands to `List.cons(A, value, List.nil(A))`.
- `Array.singleton(A, value)` expands to `Array.mk(A, List.singleton(A, value))`.

JS/TypeScript emission routes checked Core calls to small runtime helpers only after Core checking. This preserves the no-kernel-refactor constraint while adding a useful collection constructor.

## Evidence

- Focused smoke test: `tools/pslive-list-array-singleton-tests.ts`
- Checked bootstrap source: `packages/std/src/Bootstrap/Foundation.ps`
- Checked bootstrap artifact: `packages/std/core/bootstrap.pscore.json`
- Bootstrap replay/regression: `tools/k1d-foundation-tests.ts`
- TypeScript backend emission: `packages/backend-typescript/src/termEmitter.ts`
- Runtime helpers: `packages/runtime/src/source.ts`
- Feature promotion gate: `config/feature-promotion-gate.json`
- Verification matrix: `config/verification-matrix.json`

## Positive behavior

- `List.singleton(Nat, 9)` produces `List.cons(Nat, 9, List.nil(Nat))`.
- `Array.singleton(Nat, 9)` produces `Array.mk(Nat, List.cons(Nat, 9, List.nil(Nat)))`.
- JS output executes the checked singleton values.
- TypeScript output compiles and executes the checked singleton values.
- `by rfl` checks the definitional equalities through checked bootstrap expansion.

## Negative behavior

- A singleton value whose element does not type-check against `A` is rejected.
- Assigning `Array.singleton(A, value)` to `List(A)` is rejected.

## Non-claims

P5.42 does not claim full Lean collection/typeclass/library equivalence, does not add a new kernel primitive, does not refactor the kernel, does not make K3 fully formal, and does not prove full Lean 4 equivalence. This remains K3-TB trusted-boundary evidence. Formal Lean 4 equivalence proven obligations remain exactly 0.
