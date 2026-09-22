# KERNEL-mutual-nested-deeper-multiple-fields0 profile (Core v64)

Semantic baseline: Lean 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile extends frozen Core v63 only for a bounded composition of the arbitrary-depth indexed `Prop` mutual/nested helper graph with **multiple compatible deep recursive fields**. It reuses the `NestedV45Spec` specialization identity/deduplication machinery and v63 staged dependent-container parameter validation.

Trusted rules:

- all deep recursive fields in the mutual block are scanned; no field is silently ignored;
- unique helper specializations are discovered breadth-first in deterministic first-occurrence order;
- helper identity is the complete specialized container parameter vector, compared by trusted contextual definitional equality;
- identical fields therefore fully reuse their outer and inner helper families;
- distinct outer specializations may share an inner helper when the inner specialization is definitionally equal;
- every unique helper is validated using v63 sequential dependent-parameter specialization in the staged mutual-family environment;
- current container index telescopes remain live on their helpers;
- final recursive target indices remain fixed/shared-parameter-derived in this admitted slice;
- the complete enlarged graph is rechecked atomically by the existing trusted mutual checker;
- no serialized artifact metadata may authorize helper identity, deduplication, locality exceptions, or extra recursive edges.

Exact Lean evidence covers: two identical deep fields producing four motives and complete helper reuse; two distinct outer specializations sharing one inner specialization producing five motives; deterministic helper order; actual linked iota through the shared graph; and rejection of constructor-local dependent parameter specializations with `inductive.autoPromoteIndices false`.

Explicit later work includes multiple recursive-carrying parameter slots in a single container specialization, more general nonlinear recursive-parameter graphs, final conversion/WHNF closure, and resource/adversarial hardening.
