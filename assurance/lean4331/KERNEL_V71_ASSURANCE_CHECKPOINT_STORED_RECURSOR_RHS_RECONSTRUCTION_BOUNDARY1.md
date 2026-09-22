# KERNEL v71 Stored Recursor RHS Reconstruction Boundary 1

Status: PASS

Overall v71 K3-track progress recorded by this checkpoint: **90%**.

This is a conservative progress ledger, not a probability and not a full K3 theorem.

## Formal target

- ProofScriptKernelEquivalence.KernelV71StoredRecursorRHSReconstructionBoundary
- Source: assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71StoredRecursorRHSReconstructionBoundary.lean
- Source SHA-256: 046f02bda263ec726a761ec10cda864ba2e2df9b6f81b1e7052637ca4378e0df
- Theorems checked: 9
- sorryAx count: 0

## Newly bound evidence

1. Explicit `PSRecursorRuleInfo.toLeanRule` maps stored ProofScript rule metadata into pinned Lean `RecursorRule`.
2. Stored `RecursorRule.rhs` is tied to the linked RHS trace endpoint for supported v71 rules.
3. The actual TypeScript schema, metadata-emission, and reducer source slices are statically audited.
4. One fast recursor-metadata suite was freshly rerun; inherited exact-Lean RHS/positivity logs were hash-checked.
5. The inherited positivity and mutual/nested RHS boundary certificates remain linked.
6. The progress ledger advances the v71 K3 track from 85% to 90%.

## Still not proved

1. Mechanized KernelTS semantics for line-by-line TypeScript execution.
2. Arbitrary Lean stored RecursorRule.rhs round-trip iff ProofScript reconstruction.
3. Arbitrary Lean admission completeness iff ProofScript acceptance.
4. Exhaustive reduction-path completeness for every Lean expression form.
5. Final whole-kernel K3 equivalence theorem.
