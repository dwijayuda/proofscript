# KERNEL v71 Mutual/Nested Recursor RHS Certificate 1

Status: PASS

This checkpoint adds a conservative linked-RHS correspondence layer for mutual and nested recursor paths.

## Formal target

- ProofScriptKernelEquivalence.RecursorMutualNestedRHSCorrespondence
- Source: assurance/lean4331/formal/ProofScriptKernelEquivalence/RecursorMutualNestedRHSCorrespondence.lean
- Source SHA-256: 4b4c4dc111c12259d1f6b020b36b39d3353cbcebdf30634e1409e4c112e9b201
- Theorems checked: 9
- sorryAx count: 0

## Executable evidence

- Source audit obligations: 19
- Source audit missing obligations: 0
- Exact Lean suites: 5

## Boundary

This proves linked direct/indexed RHS trace translation for the current v71 supported mutual/nested slices. It does not yet prove full K3 whole-kernel equivalence or arbitrary Lean RecursorRule.rhs reconstruction.
