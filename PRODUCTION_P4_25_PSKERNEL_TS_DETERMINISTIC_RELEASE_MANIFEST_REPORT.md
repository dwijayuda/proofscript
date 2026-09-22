# Production P4.25 — Deterministic Release Manifest and Tarball Smoke Reproducibility

## Trust label

Trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Finding before the change

Phase 4.24 added an install-from-tarball smoke gate, but its evidence hash was not reproducible across repeated accepted runs because the manifest included temporary install paths and npm install output timing. The packed tarball SHA-256 itself was stable, but the tarball-smoke evidence hash changed between runs.

This was a release-evidence problem, not a kernel semantic expansion.

## Changes made

- Hardened `tools/pskernel-kernel-tarball-smoke.ts` so accepted evidence is deterministic:
  - redacts temporary install root paths from the hashed manifest;
  - records installed entrypoint as a package-relative path;
  - redacts npm install timing output;
  - records tarball path relative to the repository;
  - keeps optional `keptTempPath` outside the hashed evidence when `--keep-temp` is requested.
- Added `tools/pskernel-kernel-release-manifest.ts`.
- Added `pskernel release-manifest` CLI support.
- Added npm scripts:
  - `release-manifest:pskernel-kernel`
  - `release-manifest:pskernel-kernel:json`
  - `release-manifest:pskernel-kernel:write-docs`
- Added `docs/PSKERNEL_TS_RELEASE_MANIFEST.json`.
- Added proof obligation:
  - `ProofScript.ReleasePackage.DeterministicReleaseManifest`
- Updated smoke tests to require the release manifest and a deterministic repeated tarball-smoke check.
- Updated `pskernelStatusReport()` to advertise deterministic release-manifest evidence.

## Release manifest contents

The release manifest ties together:

- trusted-boundary status report;
- proof-obligation catalog;
- release preflight;
- npm package audit;
- install-from-tarball smoke;
- standalone audit bundle;
- package and evidence-file SHA-256 values;
- packed tarball SHA-256;
- explicit `not-proven` proof status.

It does not claim Lean 4 kernel equivalence.

## Fresh verification

```txt
npm run build -- --pretty false: PASS
npx tsc -b --force --pretty false: PASS
node tools/copy-static-assets.ts: PASS
npm run test:kernel:smoke: PASS
npm run pskernel -- status: PASS
node tools/pskernel.ts status --json: PASS
node tools/pskernel.ts check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke: PASS
node tools/pskernel.ts certify artifacts/pskernel-cli-certify-smoke.json: PASS
node tools/pskernel.ts verify-cert artifacts/pskernel-cli-verify-cert-smoke.json: PASS
node tools/pskernel.ts obligations --json: PASS
node tools/pskernel.ts audit artifacts/pskernel-cli-certify-smoke.json: PASS
node tools/pskernel.ts preflight: PASS
node tools/pskernel.ts package-audit: PASS
node tools/pskernel.ts tarball-smoke: PASS
node tools/pskernel.ts release-manifest: PASS
node tools/pskernel.ts package-audit --json --pack-destination artifacts: PASS
```

## Evidence

```txt
release-manifest: PASS
checks: 9
failures: 0
releaseManifestSha256: 28a424db277a7517102808df5589a5e48594b3a05c211bec370e41574f8a32de
preflightSha256: 012ef749317c6beca84710a365373fe6245d261947b49ab66fa344bbb56725df
packageAuditSha256: 44d93c9758e76a9b07a0bddcd7c28252e6d36a4f037ab94bfcc49544d2708327
tarballSmokeSha256: e5046da8811c4b33414e15e65ddde10061bd3107a64bcb4c0659494fe03e3f8d
packed tarball SHA-256: 23d9fe1acb1e4f89d9c410acdd4124aacc9fefc234570b79e78b561aa00e2948
proof obligations: 42 total, 0 proven
packed npm artifact: artifacts/proofscript-kernel-0.1.0-dev.0.tgz
packed files: 474
packed size: 126637 bytes
```

## Progress estimate

Overall practical trusted-boundary standalone release readiness remains ~99%.

Formal Lean 4 equivalence remains not claimed.
