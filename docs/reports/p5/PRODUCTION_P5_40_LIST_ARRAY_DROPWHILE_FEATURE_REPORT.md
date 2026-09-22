# Production P5.40 List.dropWhile / Array.dropWhile Feature Report

## Scope

P5.40 adds explicit `List.dropWhile(A, p, xs)` and `Array.dropWhile(A, p, xs)` calls to the controlled PSC-1 path. This is a compact continuation of the finite collection features added through P5.39.

## Supported behavior

- `p` must type-check as `A -> Bool`.
- `xs` must type-check as `List(A)` or `Array(A)`.
- Payloads must reduce to finite checked `List` constructors or checked `Array.mk(A, List(A))` payloads.
- The primitive drops the prefix while `p(x)` reduces to `true`.
- It stops at the first `false` predicate result and rebuilds the remaining suffix.
- Empty payloads return the empty collection.
- All-true predicate cases return the empty collection.
- First-false cases return the original collection.

## Implementation evidence

- Checked bootstrap declarations: `packages/std/src/Bootstrap/Foundation.ps`
- Regenerated checked Core artifact: `packages/std/core/bootstrap.pscore.json`
- Minimal additive K3-TB primitive reduction: `packages/kernel/src/PSKernel/TypeChecker.ts`
- JS/TypeScript emission routes: `packages/backend-typescript/src/termEmitter.ts`
- Runtime helpers after Core checking: `packages/runtime/src/source.ts`
- Focused smoke test: `tools/pslive-list-array-dropwhile-tests.ts`

## Verification

The focused test covers:

- JavaScript emission and runtime execution
- TypeScript emission, TypeScript compilation, and runtime execution
- `by rfl` definitional-equality reductions
- empty/all-true/first-false/mixed cases
- negative predicate-type rejection
- negative collection-type rejection
- negative result-type rejection

## Non-claims

P5.40 does not claim full Lean `List.dropWhile` or Array-library equivalence, no typeclass collection abstraction, no theorem library about `dropWhile`, no fully formal K3, and no full Lean 4 equivalence. This remains K3-TB trusted-boundary evidence only. Formal Lean 4 equivalence proven obligations remain exactly 0.
