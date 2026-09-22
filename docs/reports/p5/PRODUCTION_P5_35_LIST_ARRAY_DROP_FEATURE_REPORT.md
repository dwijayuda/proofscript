# PRODUCTION P5.35 List.drop / Array.drop Feature Report

## Summary

P5.35 adds explicit `List.drop(A, xs, count): List(A)` and `Array.drop(A, xs, count): Array(A)` support to the controlled PSC-1 path. The feature works over checked finite `List(A)` constructor payloads and checked `Array.mk(A, data)` payloads backed by finite checked lists. The `count` argument must type-check as `Nat`; the result is the suffix collection after dropping `count` elements, clamped to the available payload length.

## Evidence

- Red test first: `tools/pslive-list-array-drop-tests.ts` initially failed with `unknown identifier: List.drop`.
- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript emission: `packages/backend-typescript/src/termEmitter.ts`.
- Runtime helpers: `packages/runtime/src/source.ts`.
- Focused positive, negative, theorem-by-rfl, JS execution, and TypeScript compile tests: `tools/pslive-list-array-drop-tests.ts`.

## Non-claims

This is not full Lean `List.drop` / `Array.extract` / slice-library/typeclass support. It does not prove full Lean 4 equivalence, fully formal K3, or self-hosting. The trust claim remains K3-TB trusted-boundary, and formal Lean 4 equivalence proven obligations remain 0.
