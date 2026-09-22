# PRODUCTION P5.37 List.replicate / Array.replicate Feature Report

P5.37 adds explicit `List.replicate(A, count, value): List(A)` and `Array.replicate(A, count, value): Array(A)` support to the controlled PSC-1 path. The element type, count, and value must type-check through the checked bootstrap declarations; the count must reduce to `Nat`. Primitive reduction constructs finite checked payloads containing `count` copies of the already checked value, and `Array.replicate` wraps that payload in `Array.mk(A, data)`. Reduction is bounded by the existing finite payload limit.

## Evidence

- Red test first: `tools/pslive-list-array-replicate-tests.ts` initially failed with `unknown identifier: List.replicate`.
- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript execution path: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `packages/runtime/src/profile.ts`.
- Focused feature test: `tools/pslive-list-array-replicate-tests.ts` covers `rfl` reductions, JavaScript execution, TypeScript emission/compile, empty replicate, non-empty replicate, bad count type rejection, bad value type rejection, and bad result type rejection.

## Non-claims

This is not full Lean `List.replicate` / `Array.replicate` library/typeclass support. It does not prove full Lean 4 equivalence, fully formal K3, or self-hosting. The trust claim remains K3-TB trusted-boundary, and formal Lean 4 equivalence proven obligations remain 0.
