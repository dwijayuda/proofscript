# KERNEL-mutual-nested-prop0 profile

Core format: **54**  
Semantic oracle: **Lean 4.33.1** / commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Trusted semantic slice

v54 composes the bounded v53 mutual+nested preprocessing graph with Prop-valued mutual families. The profile accepts two or more mutually defined predicates when every member result is `Prop` and every recognized nested recursive field is a specialization of an already checked one-parameter, zero-index Prop container. Shared/dependent parameters, explicit universe parameters on those parameter types, and original per-member indices are preserved. Nested target indices may be closed or definitionally derived from the shared parameter context.

For every recognized specialization, the kernel synthesizes a private helper predicate, rewrites the original constructor field to that helper, constructs the helper constructors from the checked container declaration, and submits the complete enlarged mutual block to the existing trusted mutual checker. Therefore strict positivity, uniform parameters, field universes, mutual result universes, recursor generation, and the Prop-only motive policy are re-derived by trusted code rather than asserted by artifact metadata.

Restored public recursors preserve the original container/constructor identities and linked reduction routes through the corresponding helper recursors.

## Explicit boundary

Exact Lean 4.33.1 additionally accepts Prop-valued mutual/nested declarations whose nested target contains a constructor-local index, for example `WrapP (B α n)`. Lean promotes that index into an additional helper/recursor parameter. v54 intentionally does **not** implement that transformation and rejects such declarations. This is a capability gap, not a semantic approximation.

Type-valued v52 locality behavior is unchanged. Deeper combined mutual+nested graphs and indexed nested containers also remain outside this profile.

## Historical isolation

Core v54 requires `implementationProfile: KERNEL-mutual-nested-prop0`. Historical v1-v53 profiles do not enable this preprocessing path, and strict decoding rejects version/profile relabeling.
