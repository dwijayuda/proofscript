# KERNEL v71 K3-TB Practical Release Checkpoint 1

Status: **PASS**

Label: `K3-TB practical release candidate`

Progress: **99.5% engineering track**

Boundary: **PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3**

This checkpoint finalizes the practical release path for v71 under explicit trusted infrastructure assumptions. It is not fully formal K3 and must not be marketed as complete Lean kernel equivalence.

## Verified facts

- Lean baseline: `4.33.1` / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`
- Formal target: `ProofScriptKernelEquivalence.KernelV71K3TBPracticalRelease`
- Formal Lean files: 54
- New target theorems printed: 8
- Reported sorryAx: 0
- Inherited checkpoints: 22
- Inherited failures: 0
- Full Lean gate parts: 6
- Release docs checked: 8

## Reviewer command

```bash
npm install --offline --ignore-scripts
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:release
```

## Remaining full formal K3 obligations

1. verified TypeScript compiler or Lean extraction path
2. full ECMAScript/Node runtime semantics or removal of Node from the trusted checker path
3. arbitrary Lean acceptance completeness iff ProofScript acceptance
4. exhaustive all-Lean reduction-path completeness
5. unconditional final K3 theorem instantiation
