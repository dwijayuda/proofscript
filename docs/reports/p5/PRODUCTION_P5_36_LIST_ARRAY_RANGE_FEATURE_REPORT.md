# PRODUCTION P5.36 List.range / Array.range Feature Report

P5.36 adds explicit `List.range(count): List(Nat)` and `Array.range(count): Array(Nat)` support to the controlled PSC-1 path. The count must type-check as `Nat`; primitive reduction constructs finite checked `List(Nat)` payloads containing natural literals from `0` through `count - 1`, and `Array.range` wraps the payload in `Array.mk(Nat, data)`. Reduction is bounded by the existing finite payload limit.

## Evidence

- Red test first: `tools/pslive-list-array-range-tests.ts` initially failed with `unknown identifier: List.range`.
- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript execution path: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `packages/runtime/src/profile.ts`.
- Focused feature test: `tools/pslive-list-array-range-tests.ts` covers `rfl` reductions, JavaScript execution, TypeScript emission/compile, empty range, non-empty range, bad count type rejection, and bad result type rejection.

## Non-claims

This is not full Lean `List.range` / `Array.range` library/typeclass support. It does not prove full Lean 4 equivalence, fully formal K3, or self-hosting. The trust claim remains K3-TB trusted-boundary, and formal Lean 4 equivalence proven obligations remain 0.
