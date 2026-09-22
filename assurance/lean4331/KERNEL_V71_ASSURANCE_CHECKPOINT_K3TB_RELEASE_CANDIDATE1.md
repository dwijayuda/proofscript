# Kernel v71 K3-TB Release Candidate 1

Status: PASS

Progress: 99.5% engineering track (9950 basis points).

This checkpoint packages v71 as a **K3-TB trusted-boundary release candidate**. It is not full formal K3.

## Evidence

- Formal target: `ProofScriptKernelEquivalence.KernelV71K3TBReleaseCandidate`
- Formal files: 54
- Reported sorryAx: 0
- Inherited PASS checkpoints: 19
- Full Lean gate parts: 6
- Release docs hash: `55be1a4fc476b8514d69255d6ef3e9a5208bf54c9b3b15b0df06bc08837b4ca0`
- Checkpoint ledger hash: `34380cedb8174172fddcaeac2eacba64b6404df18d6337f39b61497dfb53c0b7`

## Release label

Use: `K3-TB` / trusted-boundary K3 release candidate.

Do not use: full formal K3, complete Lean kernel equivalence, verified TypeScript/Node runtime semantics.

## Remaining full-formal K3 obligations

1. verified TypeScript compiler or Lean extraction path
2. full ECMAScript or Node runtime semantics
3. arbitrary Lean acceptance completeness iff ProofScript acceptance
4. exhaustive Lean reduction-path completeness
5. instantiate conditional K3 theorem without trusted runtime assumptions
