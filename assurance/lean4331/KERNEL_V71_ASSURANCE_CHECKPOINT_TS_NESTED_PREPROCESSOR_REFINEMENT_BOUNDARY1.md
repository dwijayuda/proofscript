# KERNEL v71 TypeScript Nested Preprocessor Refinement Boundary 1

Status: PASS

Overall v71 K3-track progress recorded by this checkpoint: **80%**.

This is a conservative implementation-refinement boundary, not a full TypeScript semantics proof and not a full K3 theorem.

## Formal target

- ProofScriptKernelEquivalence.KernelV71TSNestedPreprocessorRefinementBoundary
- Source: assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71TSNestedPreprocessorRefinementBoundary.lean
- Source SHA-256: 381e78f86a650e4109dd96d268e176285d5776e45f74bd2b5018269462ece139
- Theorems checked: 8
- sorryAx count: 0

## Newly bound evidence

1. The concrete `tryCheckNestedInductive` source slice is located and hashed.
2. The dispatcher chain through v33 and v37-v45 is audited.
3. Synthetic mutual-checker reuse and atomic final environment replacement are audited.
4. Nine exact-Lean nested preprocessing suites were freshly rerun with Lean 4.33.1.
5. The formal implementation trace inherits the nested-preprocessing boundary theorem.
6. The progress ledger advances the v71 K3 track from 75% to 80%.

## Still not proved

1. Mechanized KernelTS semantics for line-by-line TypeScript execution.
2. Arbitrary Lean nested preprocessing acceptance iff ProofScript acceptance.
3. Exhaustive nested positivity completeness for every Lean expression form.
4. Arbitrary stored RecursorRule.rhs reconstruction.
5. Final whole-kernel K3 equivalence theorem.
