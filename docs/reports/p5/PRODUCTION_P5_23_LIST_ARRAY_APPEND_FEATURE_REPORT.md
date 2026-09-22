# P5.23 List.append / Array.append Feature Report

## Summary

P5.23 adds explicit `List.append(A, left, right)` and `Array.append(A, left, right)` for the PSC-1 controlled language path. The feature is intentionally bounded: both inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are rebuilt as checked `List(A)` / `Array(A)` Core values.

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Supported examples

```ts
def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) }
def ys: List(Nat) := { List.cons(Nat, 3, List.cons(Nat, 4, List.nil(Nat))) }
def appendedList: List(Nat) := { List.append(Nat, xs, ys) }

def arrA: Array(Nat) := { [1, 2] }
def arrB: Array(Nat) := { [3, 4] }
def appendedArray: Array(Nat) := { Array.append(Nat, arrA, arrB) }

theorem appended_list_rfl:
  appendedList = List.cons(Nat, 1, List.cons(Nat, 2, List.cons(Nat, 3, List.cons(Nat, 4, List.nil(Nat))))) := by rfl

theorem appended_array_rfl: appendedArray = [1, 2, 3, 4] := by rfl
```

## Architecture evidence

- `packages/std/src/Bootstrap/Foundation.ps` declares checked API types.
- `packages/std/core/bootstrap.pscore.json` stores the checked bootstrap artifact.
- `packages/kernel/src/PSKernel/TypeChecker.ts` validates full applications before bounded primitive reduction.
- `packages/backend-typescript/src/termEmitter.ts` emits `List_append` / `Array_append` only after Core checking.
- `packages/runtime/src/source.ts` provides runtime helpers for emitted JS/TypeScript.
- `tools/pslive-list-array-append-tests.ts` checks JS execution, TypeScript compile/run, `by rfl`, and fail-closed negative cases.

## Non-goals

- No full Lean `Append` typeclass support.
- No Monoid/Semigroup framework.
- No general collection abstraction.
- No full Lean List/Array library claim.
- No formal Lean 4 equivalence proof.

## Verification commands

```bash
npm run build -- --pretty false
node tools/pslive-list-array-append-tests.ts
node tools/verify-p5-controlled-release.ts
node tools/conformance-runner.ts
```
