# PRODUCTION P5.38 List.toArray / Array.toList Feature Report

P5.38 adds explicit `List.toArray(A, xs): Array(A)` and `Array.toList(A, xs): List(A)` support to the controlled PSC-1 path. The element type and source collection must type-check through checked bootstrap declarations. Primitive reduction reads checked finite constructor payloads and rebuilds canonical checked payloads: `List.toArray` returns `Array.mk(A, data)` and `Array.toList` returns a finite `List(A)`. Runtime helpers are used only after Core checking.

## Evidence

- Red test first: `tools/pslive-list-array-convert-tests.ts` initially failed with `unknown identifier: List.toArray`.
- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript execution path: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `packages/runtime/src/profile.ts`.
- Focused feature test: `tools/pslive-list-array-convert-tests.ts` covers `rfl` reductions, JavaScript execution, TypeScript emission/compile, empty conversion, non-empty conversion, bad argument type rejection, and bad result type rejection.

## Non-claims

This is not full Lean `List.toArray` / `Array.toList` library/typeclass support. It does not prove full Lean 4 equivalence, fully formal K3, or self-hosting. The trust claim remains K3-TB trusted-boundary, and formal Lean 4 equivalence proven obligations remain 0.
