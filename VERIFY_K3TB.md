# ProofScript v71 K3-TB Reproducible Verification Guide

This guide is the reviewer-facing entry point for the v71 `K3-TB` release candidate.

`K3-TB` means **K3-shaped under explicit trusted-boundary assumptions**. It does not mean fully formal K3, complete Lean kernel equivalence, verified TypeScript compiler semantics, or verified Node/ECMAScript runtime semantics.

## One-command verification

From a clean extracted archive, install the vendored dependencies and run:

```bash
npm install --offline --ignore-scripts
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb
```

The Lean binary must be Lean `4.33.1` at commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

The verifier runs these phases:

1. `npm run build`
2. `npm run test:v71:local-merged`
3. `npm run test:v71:lean-gate:finalize`
4. `npm run test:v71:k3tb-release-candidate`
5. `npm run test:v71:k3tb-verification-bundle`

The expected final markers are:

```text
K3TB_ONE_COMMAND_VERIFY_PROGRESS_OVERALL=99.5%
K3TB_ONE_COMMAND_VERIFY_STATUS=PASS
K3TB_ONE_COMMAND_VERIFY_BOUNDARY=TRUSTED_BOUNDARY_RC_NOT_FULLY_FORMAL_K3
```

## What the verification bundle proves

The bundle proves that the release candidate is reproducibly packaged with:

- a compiling Lean formal verification-bundle envelope;
- 20 inherited PASS checkpoints;
- the full six-part Lean 4.33.1 gate status;
- explicit K3-TB trust-boundary docs;
- a one-command reviewer verifier.

## What remains outside full formal K3

The overall v71 K3 engineering-track progress remains `99.5%`. This verification bundle improves reproducibility and reviewer confidence; it intentionally does not move the claim to `100%`.

Remaining full-formal K3 obligations:

1. verified TypeScript compiler or Lean extraction path;
2. full ECMAScript or Node runtime semantics;
3. arbitrary Lean acceptance completeness iff ProofScript acceptance;
4. exhaustive all-Lean reduction-path completeness;
5. instantiate the conditional K3 theorem without trusted runtime assumptions.


## P6.19 one-command doctor guard

P6.19 makes `npm run verify:k3tb` run the strict Lean environment doctor before Lean-dependent K3-TB verification. Missing or mismatched Lean now fails closed with `K3TB_LEAN_ENV_STATUS=...`, expected Lean 4.33.1, expected commit, and next action instead of an opaque assertion. This remains trusted-boundary K3-TB and not fully formal K3.
