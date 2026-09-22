# KERNEL-mutual-nested-deeper-multi-parameter-containers0 profile (Core v62)

Semantic baseline: Lean 4.33.1, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile extends frozen Core v61 only for a bounded composition of the arbitrary-depth indexed `Prop` mutual/nested helper chain with **multi-parameter indexed `Prop` containers**. Each layer may have arbitrary parameter arity, but exactly one parameter slot carries the recursive mutual path. The recursive slot may appear at any parameter position.

Trusted rules:

- original mutual members retain their shared parameters and per-member outer indices;
- exactly one container parameter slot per helper layer contains the recursive mutual path;
- every other container parameter specialization must project from constructor-local context into the shared mutual-parameter context;
- the current container's index telescope remains live on the synthesized helper;
- deeper parameter specializations and the final mutual target remain fixed/shared-parameter-derived;
- helper identity and rewrite/restore use the complete specialized container parameter vector;
- the complete enlarged graph is rechecked atomically by the existing trusted mutual checker;
- no serialized artifact metadata may authorize a recursive slot, fixed specialization, or locality exception.

Exact Lean evidence covers a two-parameter indexed `Prop` container with recursion in parameter slot 0 and parameter slot 1, live helper indices, linked proof iota, rejection of multiple recursive parameter slots in one layer, and rejection of constructor-local fixed-parameter capture.

Explicit later work includes dependent container parameter telescopes, multiple deep recursive fields/graphs, final conversion/WHNF closure, and resource/adversarial hardening.
