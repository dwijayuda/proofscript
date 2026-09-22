# P5.22 List.filter / Array.filter Feature Report

## Summary

P5.22 adds explicit `List.filter(A, p, xs)` and `Array.filter(A, p, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: predicates must already check as `A -> Bool`, inputs must reduce to finite checked `List` constructor payloads or `Array.mk(A, List(A))` payloads, and outputs are rebuilt as checked `List(A)` or `Array(A)` Core values.

## Architecture path

```text
parser / elaborator
  -> checked bootstrap declarations
  -> ordinary Core applications
  -> K3-TB kernel validation and bounded primitive reduction
  -> .pscore replay
  -> JS/TypeScript emission after Core checking
```

The backend/runtime helpers are executable witnesses only. They do not accept untyped source and do not bypass Core checking.

## Supported examples

```ts
function keepZero(x: Nat): Bool := { x == 0 }
function keepNonZero(x: Nat): Bool := { Bool.not(x == 0) }

def xs: List(Nat) := { List.cons(Nat, 0, List.cons(Nat, 2, List.cons(Nat, 0, List.nil(Nat)))) }
def filteredZeros: List(Nat) := { List.filter(Nat, keepZero, xs) }
def filteredNonZeros: List(Nat) := { List.filter(Nat, keepNonZero, xs) }

def arr: Array(Nat) := { [0, 2, 0] }
def arrayZeros: Array(Nat) := { Array.filter(Nat, keepZero, arr) }
def arrayNonZeros: Array(Nat) := { Array.filter(Nat, keepNonZero, arr) }
```

## Non-claims

- This is not full Lean `List.filter` / `Array.filter` library equivalence.
- This is not `Filterable`, `Foldable`, `Functor`, or typeclass-driven collection support.
- This is not generalized predicate simplification.
- Open or non-constructor lists/arrays remain stuck instead of being approximated.
- Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Focused checks:

```bash
node tools/pslive-list-array-filter-tests.ts
node tools/k1d-foundation-tests.ts
npm run test:pslive:language-fast
node tools/verify-p5-controlled-release.ts
node tools/conformance-runner.ts
```
