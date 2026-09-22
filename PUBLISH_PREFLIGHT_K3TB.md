# ProofScript Kernel v71 K3-TB Publish Preflight

This package is a **publish-preflight layer** for `ProofScript Kernel v71 K3-TB Practical Release Candidate 1`.

It is intended for source-archive or internal-review publication under the explicit **K3-TB trusted-boundary** label. It is **not fully formal K3** and must not be advertised as complete Lean kernel equivalence.

## Release label

Use this exact label:

```text
ProofScript Kernel v71 K3-TB Practical Release Candidate 1
```

Short label:

```text
K3-TB trusted-boundary practical release candidate
```

## One-command verification

From the unpacked archive:

```bash
npm install --offline --ignore-scripts
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:publish
```

Expected final lines include:

```text
K3TB_PUBLISH_PREFLIGHT_VERIFY_STATUS=PASS
K3TB_PUBLISH_PREFLIGHT_VERIFY_BOUNDARY=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3
K3TB_PUBLISH_PREFLIGHT_PROGRESS_OVERALL=99.5%
```

## Allowed claims

- K3-TB practical release candidate.
- Lean 4.33.1-backed trusted-boundary assurance release.
- Reproducibly verifiable under explicit trusted infrastructure assumptions.

## Forbidden claims

Do not claim:

- fully formal K3
- complete Lean kernel equivalence
- verified TypeScript/Node runtime semantics
- arbitrary Lean acceptance completeness

## Publication recommendation

Publish this as a reviewable source archive, not as a stable npm theorem-prover kernel package. The monorepo remains `private: true`; npm publishing is deliberately out of scope for v71 K3-TB.
