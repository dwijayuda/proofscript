# P5.28 List.find? / Array.find? Feature Report

P5.28 adds explicit `List.find?(A, p, xs)` and `Array.find?(A, p, xs)` for the PSC-1 controlled language path. The feature is intentionally bounded: inputs must already type-check as `List(A)` or `Array(A)`, predicates must already type-check as `A -> Bool`, payloads must reduce to finite checked constructors, and outputs are checked `Option(A)` values.

```ts
def listFindTwo: Option(Nat) := { List.find?(Nat, isTwo, xs) }
def listFindEmpty: Option(Nat) := { List.find?(Nat, isZero, List.nil(Nat)) }
def arrayFindZero: Option(Nat) := { Array.find?(Nat, isZero, arr) }
def arrayFindEmpty: Option(Nat) := { Array.find?(Nat, isZero, []) }
```

## Trusted-boundary story

The declarations live in the checked bootstrap prelude. The K3-TB kernel validates each full constant application before primitive reduction, reads only checked finite `List(A)` constructor payloads or checked `Array.mk(A, List(A))` payloads, evaluates the checked predicate to `Bool`, and returns `Option.some(A, firstMatchingValue)` or `Option.none(A)`. Open values, wrong predicates, wrong collection kinds, and wrong result types fail closed or remain stuck.

JS and TypeScript emission route through runtime helpers only after Core checking, so the executable path does not bypass the kernel/checker story.

## Non-claims

This release does not implement full Lean `List.find?` / `Array.find?` library semantics, typeclass-driven collection abstractions, decidable proposition search, generalized `BEq`/`DecidableEq` search, or formal Lean 4 equivalence. It remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
