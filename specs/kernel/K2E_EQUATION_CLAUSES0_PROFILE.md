# K2e-equation-clauses0 implementation profile

This profile is implementation coverage of **The ProofScript Language Reference v0.1** under the pinned Lean 4.33.1 semantic baseline. It does not define a new language dialect.

## Added source coverage

K2e accepts the equation-body `def` category for a conservative initial slice:

```ts
def doubleEq: Nat → Nat
  | .zero => Nat.zero
  | .succ(k) => Nat.succ(Nat.succ(doubleEq(k)))
```

Current restrictions:

- no declaration binders before the equation-body function type;
- exactly one function argument represented by one leading nondependent Pi/arrow;
- constructor patterns only (`.ctor` / `.ctor(x, ...)` or fully named constructor names);
- no numeric, wildcard, nested, inaccessible, named, multi-sequence, or multiple-argument patterns;
- dependent equation result types are unsupported in this profile.

## Lowering

Equation clauses are not core syntax. The frontend performs:

```text
def f : A → B
  | p1 => r1
  | p2 => r2

  -> synthetic explicit argument x : A
  -> match (x) { | p1 => r1 | p2 => r2 }
  -> structural-recursion analysis when f occurs recursively
  -> ordinary generated recursor application
  -> kernel-checked definition
```

No `EquationDef`, `Match`, or `RecursiveDef` core/kernel node is added.

## Equation theorems

For the supported clause set, `f.eq_1`, `f.eq_2`, ... are emitted as ordinary theorem declarations. Their proofs use ordinary `Eq.refl` and are accepted only when delta reduction plus recursor computation makes the equation definitionally valid.

K2e generates equation theorems for both supported recursive and nonrecursive equation-clause definitions. Exact naming/metadata parity with Lean 4.33.1 remains evidence-pending.

## Rejection / unsupported taxonomy

- duplicate or non-exhaustive constructor coverage: elaboration rejection;
- constructor pattern binder arity mismatch: elaboration rejection;
- multiple equation arguments / dependent results / unsupported pattern forms: `unsupported`;
- malformed source punctuation: parse rejection.

## Artifact compatibility

K2e adds no serialized core constructor, so the core wire format remains **v7**. Current producers use profile `K2e-equation-clauses0`. The v7 decoder continues to accept historical `K2c-structures-match0` and `K2d-structural-recursion0` artifacts and upgrades them to the current in-memory profile before replay.

## Not claimed

This profile does not claim general Lean equation-compiler parity, general termination checking, mutual/well-founded recursion, dependent pattern matching, complete pattern syntax, or pinned Lean differential validation.
