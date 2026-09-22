# P5.31 List.isEmpty Feature Report

P5.31 promotes explicit `List.isEmpty(A, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: input must already type-check as `List(A)`, the payload must reduce to finite checked `List.nil` / `List.cons` constructors, and the result is rebuilt as a checked `Bool` constructor. This complements the earlier P5.24 `Array.isEmpty(A, xs)` support.

## Supported form

```ts
def empty: List(Nat) := { List.nil(Nat) }
def xs: List(Nat) := { List.cons(Nat, 1, empty) }
def emptyResult: Bool := { List.isEmpty(Nat, empty) }
def nonEmptyResult: Bool := { List.isEmpty(Nat, xs) }

theorem empty_rfl: emptyResult = true := by rfl
theorem non_empty_rfl: nonEmptyResult = false := by rfl
```

## Implementation path

1. `packages/std/src/Bootstrap/Foundation.ps` declares `List.isEmpty(A, xs): Bool`.
2. `packages/std/core/bootstrap.pscore.json` is regenerated from the checked bootstrap source.
3. `packages/kernel/src/PSKernel/TypeChecker.ts` validates complete constant applications before reducing checked finite List payloads to `Bool.true` or `Bool.false`.
4. `packages/backend-typescript/src/termEmitter.ts` erases only the type argument after Core checking and emits `__ps.List_isEmpty(list)`.
5. `packages/runtime/src/source.ts` implements `List_isEmpty` using the same finite List payload reader as other PSC-1 List primitives.

## Verification

`tools/pslive-list-isempty-tests.ts` covers JS execution, TypeScript emission and execution, theorem-by-rfl reductions for empty and non-empty lists, `Array.isEmpty` regression coverage, bad collection rejection, and bad result-type rejection.

## Non-claims

This is not full Lean `List.isEmpty`/library/typeclass equivalence. It is K3-TB trusted-boundary support for explicit checked calls over finite List constructor payloads. It is not fully formal K3 and is not proven equivalent to Lean 4.
