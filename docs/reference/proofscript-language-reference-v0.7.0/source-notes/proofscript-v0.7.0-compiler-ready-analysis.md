# ProofScript v0.6.1 Compiler-Readiness Analysis

Status: **post-v0.6.1 audit**

## Summary

v0.6.1 does not change the intended ProofScript language semantics. It strengthens the reference by adding executable-facing conformance artifacts and a milestone plan. This is the correct next step after v0.6.0 because prose alone is insufficient for compiler development.

## Goal alignment

The package remains aligned with ProofScript's goal:

```text
TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.
```

The machine-readable registry improves this goal by making each friendly syntax feature explicit, classified, and traceable to a Lean lowering.

## Soundness assessment

No new semantic rule was added. The Lean-verified profile still defines meaning by canonical lowering to Lean:

```text
meaningPS(p) := meaningLean(lower(p))
```

The new conformance suite strengthens soundness discipline indirectly: it reduces the risk that an implementation accepts unregistered surface syntax or lowers an admitted feature inconsistently with the reference.

## Consistency assessment

The package is more internally consistent than v0.6.0 because:

1. feature IDs now exist in both prose and machine-readable JSON;
2. examples have source-to-Lean lowering expectations;
3. negative cases document intentionally rejected TypeScript-like expectations;
4. implementation milestones are ordered according to proof risk;
5. claim ceilings remain S1 until exact Lean 4.33.1 verification runs.

## Remaining risks

The main remaining risks are implementation and proof risks, not design contradictions:

- category lifting is still a contract until implemented against pinned Lean parser categories;
- E-class features are specified but not machine-proved;
- production TypeScript frontend conformance requires reference/production comparison;
- source-map and diagnostic correctness are named but not formalized;
- exact Lean 4.33.1 tooling is still required before S2 claims.

## Recommendation

Freeze the v0.6.1 reference as the compiler-facing specification and begin implementation with M0 and M1:

1. manifest/corpus loader;
2. D-CALL reference lowerer;
3. adjacent-call parser tests;
4. canonical Lean output for the D-CALL subset.

Do not implement E-class features before the D-CALL and declaration-alias nucleus passes the conformance corpus.
