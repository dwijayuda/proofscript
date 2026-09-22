# PRODUCTION P5.39 List.takeWhile / Array.takeWhile Feature Report

P5.39 adds explicit `List.takeWhile(A, p, xs): List(A)` and `Array.takeWhile(A, p, xs): Array(A)` support to the controlled PSC-1 path. The element type, predicate, and source collection must type-check through checked bootstrap declarations. Primitive reduction reads only checked finite constructor payloads, evaluates the checked predicate until the first `false`, and rebuilds a canonical checked prefix collection. Runtime helpers are used only after Core checking.

## Evidence

- Red test first: `tools/pslive-list-array-takewhile-tests.ts` initially failed with `unknown identifier: List.takeWhile`.
- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps` and `packages/std/core/bootstrap.pscore.json`.
- Trusted-boundary primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`.
- JS/TypeScript execution path: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, and `packages/runtime/src/profile.ts`.
- Focused feature test: `tools/pslive-list-array-takewhile-tests.ts` covers `rfl` reductions, JavaScript execution, TypeScript emission/compile/run, predicate type rejection, bad collection rejection, and result type rejection.
- Governance links: `config/feature-promotion-gate.json`, `config/verification-matrix.json`, `config/production-traceability-bundle.json`, and `config/development-workflow.json`.

## Non-claims

This is not full Lean `List.takeWhile`/Array library equivalence, not a typeclass collection abstraction, and not a formal Lean 4 equivalence proof. It is bounded PSC-1 checked-Core evidence under the K3-TB trusted-boundary profile. Formal Lean 4 equivalence proven obligations remain exactly 0.
