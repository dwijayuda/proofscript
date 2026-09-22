# Production P5.7 List(Nat) Feature Report

P5.7 promotes the next real PSC-1 language feature after Option: a small, explicit, checked `List(Nat)` subset. It is intentionally not a full Lean `List` library.

## Supported

- `List(A)` checked bootstrap inductive.
- `List.nil(A)` and `List.cons(A, head, tail)` with explicit erased type arguments.
- `List(Nat)` values.
- Exhaustive constructor matches over `List(Nat)`.
- Bounded direct structural recursion over `List(Nat)`.
- JS emission and execution smoke.
- TypeScript emission, compile, and execution smoke.
- `by rfl` theorem smoke for reducible List computations.
- Negative tests for non-exhaustive match and bad constructor payloads.

## Not Claimed

- Full Lean `List` API.
- List notation (`[]`, `::`).
- Full polymorphic List functions at source level.
- Full formal Lean 4 equivalence.

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
