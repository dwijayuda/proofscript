# K2d-structural-recursion0 implementation profile

This is implementation coverage of **The ProofScript Language Reference v0.1** (Lean 4.33.1 semantic baseline), not a new language version.

## Added in K2d

### Restricted structural recursion

Implemented source shape:

```ts
def doubleNat(n: Nat): Nat := {
  match (n) {
    | .zero => Nat.zero
    | .succ(k) => Nat.succ(Nat.succ(doubleNat(k)))
  }
}
```

The frontend-only `@proofscript/recursion` package recognizes this deliberately small structural shape. A recursive call `f(k)` is permitted only when `k` is a binder of the current constructor pattern and the already checked recursor metadata identifies that constructor field as recursive.

Accepted recursion is rewritten to an internal induction-hypothesis marker that cannot be authored in ProofScript source. The ordinary K2c match elaborator then lowers the definition to the existing generated recursor. There is **no recursive-definition core term and no recursive kernel admission rule**.

Current restrictions:

- exactly one explicit function parameter;
- definition body must be a top-level `match` directly on that parameter;
- the scrutinee inductive must be in the existing parameterless/indexless K2c match slice;
- recursive calls must be direct unary `f(k)` calls on an unshadowed recursive constructor-field binder;
- no course-of-values recursion, mutual recursion, well-founded recursion, nested structural calls on transformed arguments, local `let rec`, or termination/decreasing clauses;
- result type remains in the existing closed nondependent match-result slice.

Calls such as `f(Nat.succ(k))`, recursion outside the structural match, and recursion on a nonrecursive field are reported as `unsupported` rather than accepted with weaker semantics.

### Generated equation theorems

For each constructor branch of an accepted structurally recursive definition, the elaborator generates a checked theorem:

```text
f.eq_1
f.eq_2
...
```

For example, the successor equation for `doubleNat` has the meaning:

```ts
∀ (k: Nat),
  Eq.{1}(
    Nat,
    doubleNat(Nat.succ(k)),
    Nat.succ(Nat.succ(doubleNat(k)))
  )
```

The proof is an ordinary `Eq.refl` term accepted because delta reduction plus the inductive recursor computation rule reduces the left side to the branch equation. Equation theorems therefore add no axiom and no kernel rule.

K2d equation generation currently requires the checked standard `Eq` foundation (`--std`).

## Core/artifact boundary

K2d adds no serialized core constructor. It continues to use core artifact format v7. Current v7 producers write profile `K2d-structural-recursion0`; the decoder also accepts historical v7 `K2c-structures-match0` artifacts and upgrades them to the current in-memory profile before replay.

## Deliberate non-claims

K2d does not claim Lean's full recursive-definition elaborator, equation compiler, well-founded recursion, generated theorem naming parity beyond the implemented `eq_N` slice, termination diagnostics parity, pattern compiler parity, or pinned Lean 4.33.1 differential conformance.
