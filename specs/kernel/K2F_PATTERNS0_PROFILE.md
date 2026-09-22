# K2f-patterns0 implementation profile

Status: **implementation subset of ProofScript Language Reference v0.1**. It is not a separate language and does not claim full Lean 4.33.1 pattern elaboration.

## Added source coverage

K2f extends the existing one-discriminant pattern compiler with three explicit frontend variants:

- constructor pattern: `.zero`, `.succ(k)`, `Ctor(x, y)`;
- wildcard pattern: `_`;
- Nat zero numeric pattern: `0`.

The surface representation is discriminated; wildcard and numeric patterns are no longer encoded as fake constructor names.

## Lowering

Patterns never enter kernel Core. For a checked inductive scrutinee, the elaborator resolves each source alternative to one or more generated recursor rules. `_` is restricted to the final alternative and expands to every constructor not already covered. `0` resolves only to `Nat.zero`, and only when the scrutinee type is the checked `Nat` foundation. The existing match compiler then produces ordinary recursor applications.

## Coverage behavior

- explicit constructor + same constructor again: rejected as duplicate coverage;
- `0` + `.zero`: rejected as duplicate coverage;
- `_` before another alternative: unsupported in this conservative slice;
- nonzero numeric patterns: unsupported;
- `0` on non-`Nat`: unsupported;
- missing constructors without wildcard: rejected as non-exhaustive.

## Trust boundary

No `Pattern`, `Match`, `EquationDef`, or `RecursiveDef` kernel constructor exists. Pattern compilation remains untrusted frontend work; the standalone kernel checks only the resulting recursor terms and generated theorem declarations.

## Artifact compatibility

K2f adds no serialized Core constructor, so the wire format remains v7. Historical K2c/K2d/K2e v7 artifacts remain accepted and are normalized to the current in-memory profile before replay.

## Deferred

Nested patterns, multiple discriminants, multiple pattern arguments, or-patterns, named/inaccessible patterns, dependent pattern matching, and literal patterns beyond Nat zero remain unsupported.
