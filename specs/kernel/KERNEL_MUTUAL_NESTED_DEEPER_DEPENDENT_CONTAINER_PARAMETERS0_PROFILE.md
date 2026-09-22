# KERNEL-mutual-nested-deeper-dependent-container-parameters0 profile (Core v63)

Semantic baseline: Lean 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile extends frozen Core v62 only for a bounded composition of the arbitrary-depth indexed `Prop` mutual/nested helper chain with **dependent container parameter telescopes**. It reuses the sequential specialization discipline already trusted by the non-mutual v46 nested preprocessing path.

Trusted rules:

- original mutual members retain their shared parameters and per-member outer indices;
- exactly one top-level container parameter slot per helper layer carries the recursive mutual path;
- dependent parameter domains are checked sequentially after each earlier parameter specialization is instantiated;
- validation occurs in a cloned environment containing only staged mutual family signatures plus the pre-existing checked environment;
- dependent parameter specializations must project from constructor-local context into the shared mutual-parameter context;
- the current container index telescope remains live on the synthesized helper;
- deeper target indices remain fixed/shared-parameter-derived;
- the complete enlarged graph is rechecked atomically by the existing trusted mutual checker;
- no serialized artifact metadata may authorize a dependent specialization or locality exception.

Exact Lean evidence covers a dependent `(P : Prop) (Q : P → Prop)` indexed `Prop` container through a two-layer deep mutual/nested chain, preserved live helper indices, exact four-motive order, linked proof iota, and rejection of constructor-local dependent parameter specialization with `inductive.autoPromoteIndices false`.

Explicit later work includes multiple compatible deep recursive fields/graphs in the mutual case, final conversion/WHNF closure, and resource/adversarial hardening.
