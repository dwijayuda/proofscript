# Production P5.29 List.head? / Array.head? Feature Report

P5.29 promotes the smallest bounded collection-head API for the controlled PSC-1 path.

## Supported surface

```ts
List.head?(A, xs): Option(A)
Array.head?(A, xs): Option(A)
```

## Checked semantics

The checked bootstrap declares both APIs. The K3-TB kernel validates the full constant application before primitive reduction. Reduction fires only when the payload is a finite checked `List(A)` constructor chain or an `Array.mk(A, data)` whose `data` is such a finite checked `List(A)`.

- Empty payloads reduce to `Option.none(A)`.
- Non-empty payloads reduce to `Option.some(A, firstValue)`.

JS/TypeScript emission routes to `List_headOpt` and `Array_headOpt` only after Core checking.

## Evidence

- `tools/pslive-list-array-head-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/kernel/src/PSKernel/TypeChecker.ts`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`

## Non-claims

This is not full Lean collection/typeclass/library support, not full Array/List API support, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain exactly 0.
