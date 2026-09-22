# K2j-equality0 implementation profile

Status: **implemented subset; not full ProofScript v0.1 or Lean 4.33.1 conformance**.

This profile extends K2i without changing the trusted kernel calculus or Core wire format.

## Added source/elaboration coverage

- canonical `a = b` is parsed as propositional equality, distinct from Boolean `==`;
- equality binds tighter than function implication `→`/`->`;
- the left operand is elaborated first and its core type is inferred;
- that inferred type becomes the exact expected type of the right operand;
- the sort of the operand type determines the universe argument used for `Eq.{u}`;
- accepted equality lowers to the already checked `Eq.{u}(A, a, b)` foundation;
- no equality-specific Core or kernel term is introduced.

## Trust boundary

`=` is source/elaboration syntax only. Serialized artifacts contain ordinary applications of the checked `Eq` declaration. `psc verify` therefore replays equality propositions using the same independent kernel path as explicitly written `Eq` terms.

## Deliberate limits

- `==` remains unsupported and is not identified with propositional equality;
- `≠` and `!=` remain unsupported;
- chained `a = b = c` is rejected unless explicitly parenthesized into a type-correct form;
- fully ambiguous literal equality such as `0 = 0` is not defaulted to `Nat` because general `OfNat`/metavariable defaulting is not implemented; inferable forms such as `Nat.zero = 0` work;
- heterogeneous equality (`HEq`/`≍`), rewriting tactics, simplification, and equality typeclass APIs remain deferred.

Pinned Lean 4.33.1 differential execution remains required before claiming feature-level conformance beyond the documented subset.
