# KERNEL-prop-elimination0 profile

- ProofScript reference: v0.1
- Lean semantic baseline: 4.33.1
- Lean release commit: `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`
- Core artifact: v19
- Certificate: v2
- Previous frozen kernel profile: `KERNEL-indexed-projections0` / v18

## Trusted semantic addition

v19 derives elimination permission for admitted non-mutual proposition-valued inductives from the checked declaration itself.

- Empty `Prop` inductives may eliminate into arbitrary `Sort u`.
- Multi-constructor `Prop` inductives are restricted to Prop-valued motives.
- A one-constructor `Prop` inductive may eliminate into arbitrary `Sort u` only when each non-parameter constructor field is either proof-valued or directly exposed in the constructor result indices.
- Hidden data-valued fields therefore block large elimination; index-exposed data fields do not.
- Recursive proof fields and dependent proof fields remain proof-valued and do not block large elimination.

The kernel never trusts a serialized/frontend-controlled large-elimination flag. The permission is reconstructed during inductive admission/recursor generation. Historical v1-v18 profiles cannot acquire v19 semantics by relabeling.

## Distinct remaining rule

Lean `RecursorVal.k` K-like reduction is a separate recursor-computation property. The pinned Lean 4.33.1 `Lean/Declaration.lean` defines K-like recursors as proposition-valued inductives with exactly one constructor and zero constructor fields. v19 does not claim this separate reduction behavior complete.

## Evidence

`tools/kernel-prop-elimination-tests.ts` covers empty, proof-only singleton, hidden-data singleton, recursive-proof singleton, multiple constructors, indexed/parameterized singletons, dependent proof fields, index-exposed data, iota, strict replay, and historical-profile smuggling. The exact authenticated Lean 4.33.1 binary/commit accepts/rejects the paired probes consistently.
