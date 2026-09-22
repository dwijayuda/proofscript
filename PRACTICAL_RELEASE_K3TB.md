# ProofScript Kernel v71 K3-TB Practical Release

**Release label:** `K3-TB practical release` — a trusted-boundary K3-style release candidate.

**Overall progress:** `99.5%` on the v71 K3 engineering track.

This is the practical release path for v71. It is intended for real review, reproducible verification, and downstream experimentation under explicit trust assumptions.

This is **not fully formal K3**. It does not mean complete Lean kernel equivalence, a verified TypeScript compiler, or verified Node/ECMAScript runtime semantics.

## Release claim

When the verification command passes, this package may be described as:

- ProofScript Kernel v71 `K3-TB` practical release candidate;
- Lean 4.33.1-backed trusted-boundary assurance release;
- reproducibly verifiable under explicit trusted infrastructure assumptions;
- suitable for independent audit as a K3-style engineering milestone.

## Forbidden claims

Do not describe this release as:

- fully formal K3;
- complete Lean kernel equivalence;
- a verified TypeScript/Node runtime theorem;
- arbitrary Lean acceptance completeness;
- a replacement for the Lean kernel for all Lean artifacts.

## Trusted infrastructure

The following remain trusted rather than formally verified:

1. Lean 4.33.1 at commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` as reference oracle.
2. Node.js execution of the compiled trusted KernelTS subset.
3. TypeScript compiler preservation for the audited subset.
4. npm/package installation integrity for the vendored dependency closure.
5. Host OS process, filesystem, and environment behavior during verification.

## Reviewer command

```bash
npm install --offline --ignore-scripts
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:release
```

Expected final markers:

```text
K3TB_RELEASE_VERIFY_PHASE_PASS=k3tb-audit
K3TB_RELEASE_VERIFY_PHASE_PASS=practical-release
K3TB_RELEASE_VERIFY_PROGRESS_OVERALL=99.5%
K3TB_RELEASE_VERIFY_STATUS=PASS
K3TB_RELEASE_VERIFY_BOUNDARY=PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3
```

## Fully formal K3 remains future work

To become fully formal K3, v72 or later must discharge these assumptions:

1. verified TypeScript compiler or Lean extraction path;
2. full ECMAScript/Node runtime semantics, or removal of Node from the trusted checker path;
3. arbitrary Lean acceptance completeness iff ProofScript acceptance;
4. exhaustive all-Lean reduction-path completeness;
5. unconditional final K3 theorem instantiation.
