# KERNEL v71 Admission Boundary Certificate 1

Status: PASS

This checkpoint binds the current v71 admission/completeness boundary into one conservative Lean-checked certificate.

## Formal target

- ProofScriptKernelEquivalence.KernelV71AdmissionBoundary
- Source: assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71AdmissionBoundary.lean
- Source SHA-256: fda25193a149038b13ad7a0e003c5de62738d7706045714a0b9482f55a2595bb
- Theorems checked: 6
- sorryAx count: 0

## Certified completed slices

1. Non-mutual implementation raw-family admission soundness.
2. Non-mutual implementation package environment preservation.
3. Mixed non-mutual/mutual/nested formed-environment preservation.
4. Mutual/nested linked recursor RHS endpoint correspondence.

## Explicitly outstanding K3 obligations

1. Full mutual admission completeness.
2. Full nested preprocessing completeness.
3. Full mutual+nested positivity completeness.
4. Arbitrary Lean stored RecursorRule.rhs reconstruction.
5. Final whole-kernel K3 equivalence theorem.

## Boundary

This is an admission-boundary soundness certificate. It is not a full admission-completeness theorem and not a final K3 whole-kernel equivalence theorem.
