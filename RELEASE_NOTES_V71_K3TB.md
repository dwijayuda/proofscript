# ProofScript Kernel v71 K3-TB Release Notes

## Summary

ProofScript Kernel v71 is released as a `K3-TB` practical release candidate: a Lean 4.33.1-backed, independently auditable, trusted-boundary kernel assurance package.

This release freezes the practical path rather than continuing to inflate the percentage toward full formal K3. The honest progress value remains `99.5% engineering track`.

## Highlights

- Full six-part Lean 4.33.1 executable assurance gate is bound into the release evidence.
- Independent audit pack is included.
- One-command release verification is available through `npm run verify:k3tb:release`.
- Release docs state explicit allowed and forbidden claims.
- Formal stack now includes a practical-release envelope checked by Lean 4.33.1.
- Overclaim guards keep `K3-TB` separate from fully formal K3.

## Release status

```text
Label: K3-TB practical release candidate
Progress: 99.5% engineering track
Boundary: PRACTICAL_RELEASE_NOT_FULLY_FORMAL_K3
Lean baseline: 4.33.1 / 819816b2e0a3bf405af45ae5c7af2491d8f5bee6
```

## What changed since the independent audit pack

The practical release package adds a final release manifest, release notes, practical-release guide, trusted-infrastructure statement, one-command release verifier, and Lean-checked release envelope.

## Non-goals

This release intentionally does not claim fully formal K3, complete Lean kernel equivalence, verified Node semantics, or verified TypeScript compiler semantics.
