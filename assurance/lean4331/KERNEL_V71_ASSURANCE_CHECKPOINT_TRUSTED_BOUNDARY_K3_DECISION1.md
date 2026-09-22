# Kernel v71 Trusted-Boundary K3 Decision Certificate 1

Status: **PASS**

Overall v71 K3-track engineering progress: **99.5%**.

This checkpoint deliberately does **not** claim fully formal K3. It records the decision point between two routes:

1. **Trusted-boundary release candidate** — acceptable as an engineering assurance release if Node/ECMAScript, the vendored TypeScript compiler, npm/offline dependencies, host process/filesystem behavior, and pinned Lean 4.33.1 are explicitly trusted.
2. **Fully formal K3** — still requires verified extraction/runtime semantics and arbitrary Lean acceptance/reduction completeness.

## Formal Target

- Target: `ProofScriptKernelEquivalence.KernelV71TrustedBoundaryK3Decision`
- Source: `assurance/lean4331/formal/ProofScriptKernelEquivalence/KernelV71TrustedBoundaryK3Decision.lean`
- Lean: Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)
- Formal files: 49
- Reported sorryAx: 0

## Trusted Infrastructure Assumptions

- Lean 4.33.1 kernel is the pinned reference implementation
- Node v22 runtime correctly executes audited JavaScript for the kernel subset
- vendored TypeScript 5.8.3 compiler preserves the audited KernelTS subset
- offline npm dependency set is fixed and unchanged during certification
- host filesystem/process environment is benign for gate execution

## Fully Formal Route Still Requires

- verified TypeScript compiler or Lean extraction path
- full ECMAScript or Node runtime semantics
- arbitrary Lean acceptance completeness iff ProofScript acceptance
- exhaustive Lean reduction-path completeness
- instantiate conditional K3 theorem without trusted runtime assumptions

## Fresh Gate Output

```text
TRUSTED_BOUNDARY_K3_DECISION_FORMAL_TARGET=PASS THEOREMS=7 SORRYAX=0 FORMAL_FILES=49
TRUSTED_BOUNDARY_K3_DECISION_INHERITED_CHECKPOINTS=18 FAILURES=0
TRUSTED_BOUNDARY_K3_DECISION_FULL_LEAN_GATE=6_PARTS_PASS
TRUSTED_BOUNDARY_K3_DECISION_PROGRESS_OVERALL=99.5%
TRUSTED_BOUNDARY_K3_DECISION_STATUS=TRUSTED_INFRASTRUCTURE_RELEASE_CANDIDATE_NOT_FULLY_FORMAL_K3
PASS KERNEL-v71-trusted-boundary-k3-decision
```
