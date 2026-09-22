# Production P5.30 List.tail? / Array.tail? Feature Report

P5.30 promotes the smallest bounded collection-tail API for the controlled PSC-1 path.

```ts
List.tail?(A, xs): Option(List(A))
Array.tail?(A, xs): Option(Array(A))
```

The feature is intentionally bounded: inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are checked `Option(List(A))` / `Option(Array(A))` values. Empty payloads return `Option.none`; non-empty payloads return `Option.some` around the remaining finite checked collection.

Evidence:

- `tools/pslive-list-array-tail-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/kernel/src/PSKernel/TypeChecker.ts`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`

This release does not implement full Lean `List.tail?` / `Array.tail?` library semantics, typeclass-driven collection abstractions, generalized collection APIs, or formal Lean 4 equivalence. It remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
