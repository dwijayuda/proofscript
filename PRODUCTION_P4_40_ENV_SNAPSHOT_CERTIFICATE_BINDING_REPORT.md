# P4.40 — Environment Snapshot Certificate Binding

## Status

PASS — trusted-boundary evidence hardening completed.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

P4.39 added deterministic environment snapshots. P4.40 binds those final environment hashes into replay certificates and certificate verification, so certificate evidence covers not only the artifact and semantic summary, but also the replayed final kernel environment.

## Changes

- Added `environmentSha256` to `CoreReplayCertificate`.
- Added `environmentSha256` to `CoreReplayCertificateVerification`.
- `certifyCoreArtifact(...)` now certifies from `replayCoreArtifactWithSnapshot(...)` so the final checked environment hash is available at certificate creation.
- `validateCoreReplayCertificate(...)` now requires a lowercase 64-character SHA-256 `environmentSha256`.
- `verifyCoreReplayCertificate(...)` now reruns fresh replay/certification and rejects mismatched environment snapshot hashes.
- `pskernel certify <artifact>` now emits certificate `environmentSha256`.
- `pskernel verify-cert <bundle>` now returns the verified `environmentSha256`.
- Updated status report wording from artifact+semantic hash to artifact+semantic+environment hash.
- Added proof obligation `ProofScript.Replay.Certificate.EnvironmentSnapshotBinding`.

## Smoke tests added

- Certificate includes a final environment SHA-256.
- Certificate environment SHA-256 equals fresh `replayCoreArtifactWithSnapshot(...)` output.
- Certificate verifier preserves the verified environment SHA-256.
- Forged `environmentSha256` rejects.
- Legacy/partial certificate without `environmentSha256` rejects.
- CLI `pskernel certify` emits `environmentSha256`.

## Verification commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts certify artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts verify-cert /tmp/p4_40_verify_bundle.json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

## Verification results

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel certify: PASS, certificate.environmentSha256 present
pskernel verify-cert: PASS, environmentSha256 preserved
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0
```

Observed certificate environment hash in smoke artifact:

```txt
60ae4d840beb515016710e003b45ed8adc771cc1c2d38a87f99b3d6aef936f0d
```

## Why this matters

A semantic hash alone binds the replay summary, but not the complete final environment inventory. The new certificate environment hash provides stronger deterministic evidence that primitive prelude entries, generated constants, assumptions, metadata, and user declarations replay to the same final trusted environment.

This remains evidence, not a formal proof or signature.

## Current progress estimate

```txt
Standalone PSC-1 without Lean4: ~90%
PSC-1 small complete programming language: ~59%
PSC-1 small theorem prover: ~56%
Full ProofScript compiler: ~51%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

## Next best work

Add deterministic environment snapshot comparison tools and/or snapshot-golden fixtures for regression, then continue small PSC-1 surface features only when each feature lowers to already-checked Core and fails closed outside the supported subset.
