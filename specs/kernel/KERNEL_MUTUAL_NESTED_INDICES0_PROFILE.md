# KERNEL-mutual-nested-indices0 profile

- Core artifact: v52
- ProofScript reference: v0.1
- Lean semantic baseline: 4.33.1
- Immediate rollback: `KERNEL-mutual-nested-parameters0` / v51

v52 extends the bounded one-level mutual+nested helper graph through original mutual members with per-member index telescopes. Nested targets may use closed or shared-parameter-derived fixed index tuples. Any nested target index that depends on a constructor-local/index-local variable is rejected, matching Lean 4.33.1's `nested inductive datatypes parameters cannot contain local variables` boundary.

Nested containers remain monomorphic one-parameter zero-index `Type -> Type` families in this milestone. Explicit universe polymorphism, mutual `Prop`, deeper mutual+nested graphs, and indexed nested containers remain separate future slices.
