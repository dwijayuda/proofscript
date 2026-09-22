# Trusted Infrastructure Statement for v71 K3-TB

ProofScript Kernel v71 `K3-TB` is a trusted-boundary release candidate. Its verification story is strong but conditional. It is not fully formal K3.

## Trusted components

| Component | Status | Why it is trusted |
|---|---:|---|
| Lean 4.33.1 reference binary | Trusted oracle | Used as pinned comparison baseline, not proved inside this package |
| Node.js | Trusted runtime | Executes compiled JavaScript for the trusted KernelTS subset |
| ECMAScript semantics | Trusted platform semantics | Not fully modeled by the current Lean proof stack |
| TypeScript compiler | Trusted compiler | Vendored and audited at package level, not formally verified |
| npm/offline install | Trusted packaging path | Dependency closure is fixed, but npm itself is not verified |
| Host OS/filesystem/processes | Trusted execution environment | Needed to run Lean, Node, npm, and file verification |

## What is verified by this package

The package verifies that the release artifacts, inherited checkpoints, Lean version pinning, trust-boundary labels, formal envelopes, and reviewer commands are internally consistent.

## What is not verified by this package

This package does not prove a full semantics for TypeScript, Node, ECMAScript, npm, or the host operating system. It also does not prove arbitrary Lean acceptance completeness for every Lean kernel artifact.
