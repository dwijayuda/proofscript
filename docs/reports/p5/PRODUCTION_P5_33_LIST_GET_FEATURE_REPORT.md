# PRODUCTION P5.33 List.get? Feature Report

## Summary

P5.33 adds explicit `List.get?(A, xs, index): Option(A)` support to the controlled PSC-1 path. The feature works over checked finite `List(A)` constructor payloads and a checked `Nat` index. In-bounds indices return `Option.some(A, value)`. Empty lists and out-of-bounds indices return `Option.none(A)`.

## Trust boundary

This is a K3-TB trusted-boundary feature, not a fully formal K3 or Lean-equivalence proof. The standard bootstrap declaration gives the Core type, the kernel validates the full constant application before bounded primitive reduction, and JS/TypeScript helpers are used only after Core checking.

## Evidence

- Positive execution and theorem/reduction smoke: `tools/pslive-list-get-tests.ts`
- Negative fail-closed smoke: bad index type, bad collection type, and bad result type in `tools/pslive-list-get-tests.ts`
- Checked bootstrap evidence: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`
- Kernel evidence: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Backend/runtime evidence: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `packages/runtime/src/profile.ts`

## Non-claims

- This is not full Lean `List.get`/`List.get?`/Fin-indexed collection support.
- This is not general collection typeclass support.
- This does not prove full Lean 4 equivalence.
- Formal Lean 4 equivalence proven obligations remain exactly `0`.
