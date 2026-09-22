# KERNEL-mutual-nested-polymorphic0 profile

- Core artifact: v53
- ProofScript reference: v0.1
- Lean semantic baseline: 4.33.1
- Immediate rollback: `KERNEL-mutual-nested-indices0` / v52

v53 extends the bounded mutual+nested helper graph through explicit universe-polymorphic mutual families and nested containers. Every explicit universe argument on a nested container application is preserved and used to instantiate the already-admitted container declaration. Synthesized helper families share the original mutual block's declared universe parameters, and the enlarged block is rechecked atomically by the existing trusted mutual checker.

The supported slice composes with v51 shared/dependent uniform parameters and v52 per-member outer indices/fixed shared-context nested target indices. Result-universe mismatches are rejected. Mutual `Prop`, deeper mutual+nested graphs, and indexed nested containers remain separate future slices.
