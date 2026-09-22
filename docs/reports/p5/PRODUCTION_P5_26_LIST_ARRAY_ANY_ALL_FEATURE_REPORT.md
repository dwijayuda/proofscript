# P5.26 List.any / List.all / Array.any / Array.all Feature Report

P5.26 adds explicit `List.any(A, p, xs)`, `List.all(A, p, xs)`, `Array.any(A, p, xs)`, and `Array.all(A, p, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: inputs must already type-check as `List(A)` or `Array(A)`, predicates must already type-check as `A -> Bool`, payloads must reduce to finite checked constructors, and outputs are checked `Bool` values.

```ts
function isZero(x: Nat): Bool := { x == 0 }
def hasZero: Bool := { List.any(Nat, isZero, xs) }
def allZero: Bool := { List.all(Nat, isZero, xs) }
def arrayHasZero: Bool := { Array.any(Nat, isZero, arr) }
def arrayAllZero: Bool := { Array.all(Nat, isZero, arr) }
```

The trusted-boundary kernel validates the complete constant application before primitive reduction, traverses only finite checked List constructor payloads or Array.mk/List payloads with matching element type, evaluates the checked predicate to Bool at each element, and returns the bounded collection result. Empty List/Array cases are `any = false` and `all = true`. If a predicate result does not reduce to Bool, the primitive reduction remains stuck instead of inventing a value.

JavaScript and TypeScript emission call `List_any`, `List_all`, `Array_any`, and `Array_all` helpers only after Core checking. Runtime helpers operate on already-emitted PSC-1 struct values and are not a source of type authority.

Focused test: `tools/pslive-list-array-any-all-tests.ts`.

The compact controlled-release gate includes build, architecture/status matrices, focused P5 language tests, the new any/all feature smoke, standalone small smoke, and kernel smoke. `node tools/conformance-runner.ts` remains the companion conformance check.

This release does not implement full Lean `List.any`/`List.all`/`Array.any`/`Array.all` library semantics, typeclass-driven collection abstractions, decidable proposition search, or formal Lean 4 equivalence. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
