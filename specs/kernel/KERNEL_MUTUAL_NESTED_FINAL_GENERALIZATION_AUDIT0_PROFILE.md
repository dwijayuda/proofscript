# KERNEL-mutual-nested-final-generalization-audit0 profile

Core artifact format: **66**  
ProofScript language baseline: **v0.1.6**  
Semantic baseline: **Lean 4.33.1**, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile inherits Core 65 and closes the audited mutual/nested inductive target without trusting new serialized graph metadata.

The trusted checker generalizes the breadth-first, definitionally deduplicated helper graph across:

- `Prop` and a shared result universe that is provably nonzero (`Type`-valued);
- monomorphic `Type 0` and explicit universe-polymorphic blocks;
- indexed and non-indexed original families;
- arbitrary-depth nonlinear nested graphs with multiple compatible fields;
- more than one recursive-carrying container parameter slot;
- strictly-positive nested occurrences inside Pi codomains and function-valued recursive container parameters;
- transitive helper closure through previously admitted mutually recursive container families.

Security invariants:

- every helper/sibling dependency is rediscovered from checked declarations and actual constructor field terms;
- helper specializations are deduplicated only by trusted contextual definitional equality;
- fixed/specialized values must satisfy the existing shared-context locality rules;
- Pi-domain recursive occurrences remain rejected by positivity;
- bare mutual result `Sort u` that may instantiate to both `Prop` and `Type` is rejected, matching the pinned Lean behavior;
- mixed mutual result universes are rejected by the admitted shared-result-universe model;
- the complete expanded synthetic graph is rechecked atomically by the existing direct-mutual checker, which independently derives positivity, recursive targets, induction hypotheses, recursor signatures and iota rules;
- Core v1-v65 profiles do not enable v66 semantics, and strict codec/profile pairing rejects relabeling.

The dedicated exact-Lean/replay gate is `tools/kernel-mutual-nested-final-generalization-audit-tests.ts`.
