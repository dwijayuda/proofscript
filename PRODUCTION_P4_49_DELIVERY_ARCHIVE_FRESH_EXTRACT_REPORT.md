# Production P4.49 — Delivery Archive Fresh-Extract Verification

Trust label: **trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet**.

## Goal

P4.49 closes a practical release-delivery gap left after P4.48. Earlier release evidence could verify the current workspace and bind delivery-bootstrap evidence into the manifest, but there was no first-class command that accepts a distributed release `.zip`, extracts it into a fresh temporary directory, builds it there, and checks that the extracted archive can reproduce the expected trusted-boundary evidence.

## Implemented

- Added `tools/pskernel-kernel-delivery-archive-verify.ts`.
- Added `tools/delivery-archive-verification-tests.ts`.
- Added CLI command:
  - `node tools/pskernel.ts verify-delivery-archive <zip> [--json|--write-docs|--full|--keep-temp]`
- Added npm scripts:
  - `delivery-archive-verify:pskernel-kernel`
  - `delivery-archive-verify:pskernel-kernel:json`
  - `delivery-archive-verify:pskernel-kernel:full`
  - `test:delivery-archive-verification`
- Added package/static evidence support for:
  - `docs/PSKERNEL_TS_DELIVERY_ARCHIVE_VERIFICATION.json`
- Package audit and tarball smoke now require delivery-archive verification evidence in package docs.
- Added proof obligation:
  - `ProofScript.Release.Delivery.ArchiveFreshExtractVerification`

## What the new verifier checks

The bounded verifier:

1. Confirms the supplied `.zip` exists and records bytes/SHA-256.
2. Extracts it to a fresh temporary directory.
3. Finds the `proofscript-monorepo` project root containing `tools/pskernel.ts`.
4. Bootstraps local `@proofscript/*` workspace package links from inside the extracted tree.
5. Runs `npm run build -- --pretty false` from the extracted tree.
6. Checks `pskernel status --json` remains trusted-boundary / not-proven.
7. Runs the standalone-small smoke from the extracted tree.
8. Runs manifestless delivery-bootstrap evidence from the extracted tree.
9. Runs source-tree evidence from the extracted tree.

The optional `--full` mode also runs full `pskernel verify-delivery --json` inside the extracted archive. It is intentionally heavier.

## RED/GREEN

RED:

```text
node tools/pskernel.ts verify-delivery-archive <zip> --json
=> command did not exist / no first-class distributed-zip verifier
```

GREEN:

```text
verify-delivery-archive accepts a real distributed ProofScript release zip after fresh extraction, build, status, standalone-small, delivery-bootstrap, and source-tree checks.
missing or malformed zip inputs reject.
```

## Verification evidence

Fresh commands run for P4.49:

```bash
npm run build -- --pretty false
npm run test:delivery-archive-verification
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts verify-delivery-archive /mnt/data/proofscript-standalone-delivery-bootstrap-bound-p4-48.zip --json --write-docs
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p49tar-smoke2
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p49manifest-pack-final
node tools/pskernel.ts verify-release-manifest artifacts/p4-49-release-manifest-final.json --json --fresh --pack-destination /tmp/p49manifest-fresh-final
node tools/pskernel.ts verify-delivery --json --write-docs
```

Observed result summary:

```text
build: PASS
delivery-archive-verification-tests: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
verify-delivery-archive on P4.48 zip: accepted, failures=0, checks=9
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
release-manifest: accepted, failures=0
verify-release-manifest --fresh: accepted, failures=0, checks=30
verify-delivery: accepted, failures=0
```

Observed hashes:

```text
p4_48_archive_delivery_verification_sha256=135c4c66c3da6e0adc1da8c5c07249d29eb4f14710f2eaf6661a33fb418bee4d
packageAuditSha256=ac9f899e202b1783cd3ae04b05525e5a50a912981826737d321c93664de01f23
tarballSmokeSha256=e5fc7d603f8d8532063681103c010022d15ec19909d26a05594c8b885099b1a5
releaseManifestSha256=b2e62668b7b7fb5edfeee22f081993875b7b6012714e3b5b17b75315aabb6b37
deliveryVerificationSha256=70f368a8c61807aaf194f97213015a444a99900d3bca163e76b5803534e1c679
```

## Boundary

This is release-delivery evidence, not a proof of formal equivalence with Lean 4. It improves reproducibility and reviewer confidence that a delivered archive can bootstrap, build, and rerun the trusted-boundary evidence chain from a fresh extraction.

## Progress estimate

```text
Standalone PSC-1 without Lean4: ~93.7%
PSC-1 small complete programming language: ~60.8%
PSC-1 small theorem prover: ~59.2%
Full ProofScript compiler: ~54.4%
Full Lean-like ProofScript without Lean4: ~11.1%
Formal Lean 4 equivalence: 0 proven obligations
```
