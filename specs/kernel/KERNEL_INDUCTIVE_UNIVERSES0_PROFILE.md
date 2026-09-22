# KERNEL-inductive-universes0 Profile

Semantic baseline: ProofScript Language Reference v0.1 / Lean 4.33.1 (`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`).

Core artifact format: **v21**.

This kernel-only profile preserves every v20 trusted behavior and adds Lean 4.33.1 constructor-field universe admission for the currently admitted non-mutual inductive Core. For each constructor binder after the uniform parameter prefix, the trusted kernel infers the binder domain's sort in the constructor-local context and requires that sort level to be at most the inductive family's result sort level. If the inductive result sort normalizes to `Prop`, the ceiling is waived, matching Lean's impredicative predicate rule. Uniform parameter binders are not subject to this constructor-field ceiling.

The rule is derived from checked Core; no frontend or serialized permission bit is trusted. Historical v1-v20 profiles keep their original admission semantics. Mutual/nested inductive preprocessing remains unsupported and is not claimed by this profile.
