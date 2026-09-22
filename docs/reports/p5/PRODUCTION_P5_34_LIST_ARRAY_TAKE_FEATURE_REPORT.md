# PRODUCTION P5.34 List.take / Array.take Feature Report

## Summary

P5.34 adds explicit `List.take(A, xs, count): List(A)` and `Array.take(A, xs, count): Array(A)` support to the controlled PSC-1 path. The feature works over checked finite `List(A)` constructor payloads and checked `Array.mk(A, data)` payloads backed by finite checked lists. The `count` argument must type-check as `Nat`; the result is the prefix collection, clamped to the available payload length.

## Evidence

- Red test first: `tools/pslive-list-array-take-tests.ts` initially failed with `unknown identifier: List.take`.
- Positive execution and theorem/reduction smoke: `tools/pslive-list-array-take-tests.ts`.
- Negative fail-closed smoke: bad index type, bad collection type, bad array/list mismatch, and bad result type in `tools/pslive-list-array-take-tests.ts`.
- Checked bootstrap evidence: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript backend/runtime evidence: `packages/backend-typescript/src/termEmitter.ts` and `packages/runtime/src/source.ts`.

## Non-claims

This is not full Lean `List.take` / `Array.extract` / slice-library/typeclass support. It does not prove full Lean 4 equivalence, fully formal K3, or self-hosting. The trust claim remains K3-TB trusted-boundary, and formal Lean 4 equivalence proven obligations remain 0.
