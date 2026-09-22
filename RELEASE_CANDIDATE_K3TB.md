# ProofScript Kernel v71 K3-TB Release Candidate 1

**Release label:** `K3-TB` — K3-shaped trusted-boundary release candidate.

**Overall progress:** `99.5%` on the conservative v71 K3 engineering track.

This package is intentionally **not** a fully formal K3 proof. In plain terms: it is not a fully formal K3 proof. It packages the v71 kernel with a pinned Lean 4.33.1 assurance gate, 19 inherited PASS checkpoints, and an explicit trusted infrastructure boundary.

## What this release candidate claims

The v71 artifact is suitable for review as a trusted-boundary K3 release candidate when all of these are accepted as trusted infrastructure:

1. Lean 4.33.1 at commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` is the pinned reference kernel.
2. Node.js executes the audited compiled JavaScript correctly for the KernelTS subset.
3. The vendored TypeScript compiler preserves the audited KernelTS subset.
4. The offline npm dependency closure is fixed.
5. The host filesystem/process environment is benign during certification.

## What this release candidate does not claim

This package must not be described as:

- fully formal K3;
- complete Lean kernel equivalence;
- a verified Node/ECMAScript runtime model;
- a verified TypeScript compiler;
- arbitrary Lean acceptance completeness for every Lean kernel artifact.

## Verification command

```bash
npm run build
npm run test:v71:local-merged
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run test:v71:lean-gate:finalize
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run test:v71:k3tb-release-candidate
```

## Remaining full-formal K3 work

1. Verified TypeScript compiler or Lean extraction path.
2. Full ECMAScript/Node runtime semantics.
3. Arbitrary Lean acceptance completeness iff ProofScript acceptance.
4. Exhaustive all-Lean reduction-path completeness.
5. Instantiate the final K3 theorem without trusted runtime assumptions.
