# KERNEL-dependent-fields0 profile

Core format: **v22**. Semantic baseline: **Lean 4.33.1**.

## Trusted semantic delta

The simple parameterless/indexless inductive path now admits constructor-local field types that depend on earlier constructor fields. The dependency is checked using the constructor-local de Bruijn context. Existing v21 constructor-field universe admission and v16 strict positivity continue to apply.

The simple recursor generator preserves these dependencies in minor-premise telescopes. For a strictly-positive higher-order recursive field whose Pi domain depends on an earlier field, the pointwise induction-hypothesis telescope preserves that dependency and ordinary iota reduction constructs the corresponding IH.

No frontend or serialized permission bit is trusted. Historical v1-v21 profiles retain the old simple dependent-field rejection. Parameterized/indexed dependent fields were already supported and are regression-tested unchanged.

## Evidence

`tools/kernel-dependent-fields-tests.ts` covers ordinary dependent fields, deeper dependent chains, dependent higher-order recursion, recursor type generation, iota, inference, indexed regression, v22 serialization/replay, profile mismatch rejection, historical v21 isolation, and exact Lean 4.33.1 observations.

## Deliberately remaining

This profile does not claim mutual/nested inductives, full recursor term-shape completeness, or completion of the remaining general dependent indexed/recursor edge cases.
