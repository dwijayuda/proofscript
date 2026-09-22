# KERNEL-dependent-indexed-recursor-completion0 profile

- ProofScript reference: v0.1
- Lean semantic baseline: 4.33.1
- Lean release commit: `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`
- Core artifact: v49
- Certificate: v2
- Previous frozen kernel profile: `KERNEL-recursor-family-binder-info0` / v48

## Profile purpose

v49 is an assurance/conformance profile. It does **not** add a new trusted reduction, typing, positivity, universe, or Prop-elimination rule over v48. It records completion of the final exact-oracle audit for the current non-mutual dependent/indexed recursor target.

Required v49 observations include:

- dependent index telescopes where later index domains depend on earlier indices;
- higher-order recursive indexed fields with pointwise IHs indexed by an inner binder;
- exact recursive-index propagation through iota;
- v48 recursor family/index BinderInfo policy;
- strict artifact replay with `projectPluginsLoaded: false`;
- semantic preservation under historical v48 for declarations that require no new theory rule.

## Prop-elimination negative boundary

Exact Lean 4.33.1 with `inductive.autoPromoteIndices false` distinguishes direct field exposure from merely definitionally equal wrapped forms during singleton-Prop elimination classification. A direct constructor field used as a result index may permit large elimination; beta/zeta-wrapped occurrences remain Prop-only. v49 therefore preserves the v19 direct syntactic exposure rule.

## Next semantic milestone

`KERNEL-mutual-nested-generalization0`.
