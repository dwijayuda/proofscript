# Production P5.32 List.last? / Array.last? Feature Report

P5.32 adds explicit `List.last?(A, xs)` and `Array.last?(A, xs)` to the controlled PSC-1 path. Inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are checked `Option(A)` values.

```ts
def listLast: Option(Nat) := { List.last?(Nat, xs) }
def listLastEmpty: Option(Nat) := { List.last?(Nat, List.nil(Nat)) }
def arrayLast: Option(Nat) := { Array.last?(Nat, arr) }
def arrayLastEmpty: Option(Nat) := { Array.last?(Nat, []) }
```

## Semantics

- `List.last?(A, List.nil(A))` reduces to `Option.none(A)`.
- `List.last?(A, List.cons(A, h, t))` reduces to `Option.some(A, lastValue)` for the final checked element in the finite payload.
- `Array.last?(A, Array.mk(A, xs))` follows the same finite payload semantics over `xs`.
- Open/non-constructor payloads remain stuck rather than approximated.
- Ill-typed collection arguments and wrong result types are rejected before runtime emission.

## Trust boundary

This is a checked-bootstrap plus existing-K3-TB-rule feature. The standard bootstrap declares the API types; the kernel validates complete applications before bounded primitive reduction; the backend emits runtime helper calls only after Core checking; and runtime helpers implement observable JS/TypeScript behavior for already-checked Core.

## Evidence

- `tools/pslive-list-array-last-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/kernel/src/PSKernel/TypeChecker.ts`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`

## Non-claims

This is not full Lean `List.last?`, `Array.back?`, `Array.getLast?`, collection-library, typeclass, partial-indexing, proof-carrying non-empty collection, or theorem-library support. ProofScript remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain exactly 0.
