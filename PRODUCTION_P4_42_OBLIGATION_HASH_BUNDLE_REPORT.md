# P4.42 — Obligation Hash Binding in Deterministic Certificate Bundles

## Status

PASS — implemented as a trusted-boundary evidence hardening pass.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

P4.41 created deterministic certificate bundles, but the proof-obligation catalog was bound only indirectly through the audit hash. P4.42 makes the proof-obligation catalog hash explicit in bundle evidence and bundle verification.

This improves reviewer/auditor visibility: a bundle now says exactly which machine-readable proof-obligation catalog it was created against.

## Changes

```txt
- Added CoreReplayAuditBundle.obligationsSha256.
- Added CoreReplayCertificateBundle.obligationsSha256.
- Added CoreReplayCertificateBundleVerification.obligationsSha256.
- createCoreReplayCertificateBundle(...) now emits obligationsSha256 from the current proofObligationReport().
- validateCoreReplayCertificateBundle(...) now requires obligationsSha256 to be a lowercase SHA-256 digest.
- verifyCoreReplayCertificateBundle(...) now reports obligationsSha256 on accepted verification.
- verifyCoreReplayCertificateBundle(...) rejects forged/stale obligationsSha256 by fresh replay/rebundle.
- Added proof obligation:
  ProofScript.Replay.CertificateBundle.ObligationCatalogBinding
- Added RED/GREEN smoke tests for explicit obligation-catalog hash binding.
```

## TDD note

RED observed:

```txt
AssertionError: certificate bundle should bind the proof-obligation catalog hash explicitly
actual: undefined
expected: <sha256(proofObligationReport())>
```

GREEN observed after implementation:

```txt
npm run test:kernel:smoke: PASS
```

## Fresh verification

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts bundle artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts verify-bundle /tmp/p42_bundle.json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

## Observed hashes

```txt
obligationsSha256=6898a96163290c1ff00ec40f8470c1832895d14f80cbe44d030dbd515d6d04c0
bundleSha256=c6a013e6b188551ab366cd7047f66e5f1e34b92fb3520f13ccc552e06e80f00f
```

## Verification result

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel bundle: PASS
pskernel verify-bundle: PASS
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0
```

## Current progress estimate

```txt
Standalone PSC-1 without Lean4: ~91.5%
PSC-1 small complete programming language: ~60%
PSC-1 small theorem prover: ~57.5%
Full ProofScript compiler: ~52.5%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

## Remaining important caveat

`obligationsSha256`, `auditSha256`, `environmentSha256`, `semanticSha256`, and `bundleSha256` are deterministic evidence hashes, not cryptographic signatures and not formal Lean equivalence proofs. The trust label remains trusted-boundary only.
