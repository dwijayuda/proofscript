# K2c-structures-match0 implementation profile

This file documents implementation coverage only. It does not define a new ProofScript language version. The semantic source of truth remains **The ProofScript Language Reference v0.1**, pinned to Lean 4.33.1.

## Added in K2c

### Restricted `structure` source lowering

Implemented source form:

```ts
structure PairNat {
  fst: Nat;
  snd: Nat;
}
```

The frontend lowers this to ordinary checked core declarations:

1. a parameterless/indexless single-constructor inductive `PairNat`;
2. constructor `PairNat.mk` through the existing inductive admission path;
3. generated recursor `PairNat.rec` through the existing recursor path;
4. transparent projection definitions `PairNat.fst` and `PairNat.snd`, implemented with the generated recursor.

There is **no structure kernel declaration kind** and no structure-specific logical admission rule.

Current structure restrictions:

- no structure parameters;
- no dependent fields;
- no recursive fields;
- no empty structures;
- fields are restricted to the current closed `Prop`/`Type` universe slice;
- structure instance `{ field := value }`, updates, defaults, extension and generalized field notation remain unsupported.

### Restricted nondependent `match`

Implemented source shape:

```ts
def isZeroNat(n: Nat): Bool := {
  match (n) {
    | .zero => Bool.true
    | .succ(k) => Bool.false
  }
}
```

The frontend proves exhaustiveness against the generated recursor metadata and lowers the match to an ordinary recursor application. There is **no `Match` core/kernel term**.

Current match restrictions:

- one discriminant;
- parameterless/indexless inductive scrutinee;
- constructor patterns only;
- direct pattern binders only;
- all constructors must occur exactly once;
- result type must be closed and nondependent;
- no inaccessible/named/or-patterns, motives, generalization, dependent matching or `do match`.

For directly recursive constructors, the generated recursor induction hypothesis is inserted as an internal binder and ignored unless future recursion elaboration explicitly uses it.

## Artifact profile

Current artifact profile: `K2c-structures-match0`, format v7.

The v7 format does not add a `structure` or `match` kernel node. K2c source forms are already normalized to ordinary inductive/definition/recursor core before serialization. The version/profile bump records the expanded accepted source-to-core contract and keeps historical profile gating explicit.

## Deliberate non-claims

This profile does not claim full Lean structure environment metadata, projection syntax parity, dependent structure semantics, full pattern matching, structural recursive `def`, equation theorem generation, or full Lean 4.33.1 differential conformance.
