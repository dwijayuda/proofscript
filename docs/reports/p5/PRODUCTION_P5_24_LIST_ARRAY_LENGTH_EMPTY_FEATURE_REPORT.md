# P5.24 List.length / Array.isEmpty Feature Report

Status: **PASS**.

P5.24 adds explicit `List.length(A, xs)` and `Array.isEmpty(A, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: inputs must already type-check as `List(A)` or `Array(A)`, payloads must reduce to finite checked constructors, and outputs are rebuilt as checked `Nat` literals or `Bool` constructors.

## Supported surface

```ts
def xs: List(Nat) := { List.cons(Nat, 1, List.cons(Nat, 2, List.nil(Nat))) }
def xsLength: Nat := { List.length(Nat, xs) }

def arr: Array(Nat) := { [1, 2] }
def arrIsEmpty: Bool := { Array.isEmpty(Nat, arr) }
def emptyArrayIsEmpty: Bool := { Array.isEmpty(Nat, []) }
```

## Checked path

1. `packages/std/src/Bootstrap/Foundation.ps` declares `List.length` and `Array.isEmpty`.
2. `packages/std/core/bootstrap.pscore.json` stores the checked Core artifact.
3. `packages/kernel/src/PSKernel/TypeChecker.ts` reduces only complete checked applications over finite payloads.
4. `packages/backend-typescript/src/termEmitter.ts` emits runtime helpers only after Core checking.
5. `packages/runtime/src/source.ts` implements `List_length` and `Array_isEmpty` over the same runtime payload representation used by existing List/Array primitives.

## Verification

Focused test: `tools/pslive-list-array-length-empty-tests.ts`.

Release gate: `tools/verify-p5-controlled-release.ts`.

Companion conformance: `node tools/conformance-runner.ts`.

## Non-claims

- This is not full Lean `List.length` / `Array.isEmpty` library equivalence.
- This does not add overloaded collection typeclasses.
- This does not add general recursion or proof automation.
- Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
- Formal Lean 4 equivalence remains 0 proven obligations.
