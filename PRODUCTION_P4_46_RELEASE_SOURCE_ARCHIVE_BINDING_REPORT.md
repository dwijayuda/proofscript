# P4.46 — Release Source Archive Binding

## Status

Completed as a trusted-boundary release-evidence slice.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

P4.45 bound the deterministic source-tree inventory into the release manifest. P4.46 adds a second layer: a deterministic zip archive evidence object that binds the actual release-critical source archive to the same source-tree payload.

This improves the release story because reviewers can now verify:

```txt
source tree inventory -> deterministic source archive -> release manifest -> fresh-bound verifier
```

## Changes

```txt
Added tools/pskernel-kernel-release-archive.ts
Added CLI command: node tools/pskernel.ts source-archive --json --output <zip>
Added CLI command: node tools/pskernel.ts verify-source-archive <evidence.json> --json
Added npm scripts: release-archive:pskernel-kernel*
Added docs/PSKERNEL_TS_RELEASE_ARCHIVE.json package evidence
Added package/tarball audit checks for release-archive evidence docs
Added release-manifest component hashes:
  releaseArchiveSha256
  releaseArchiveZipSha256
  releaseArchivePayloadSha256
  releaseArchiveSourceTreeSha256
Added fresh-bound release-manifest verification of source-archive evidence
Added proof obligation: ProofScript.Release.Manifest.SourceArchiveBinding
```

## Deterministic archive profile

```txt
schema: proofscript-pskernel-ts-kernel-release-archive/v1
profile: release-critical-source-tree-zip
root directory: proofscript-standalone-release
fixed timestamp: 1980-01-01T00:00:00.000Z
tool: zip -X -q -@ over sorted fixed-mtime staged files
payload source: snapshotProofScriptSourceTree()
```

## TDD result

```txt
RED:
pskernel source-archive command did not exist.

GREEN:
pskernel source-archive creates deterministic zip evidence;
pskernel verify-source-archive accepts fresh matching archive evidence;
forged archive sha256 rejects.
```

## Verification commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts source-archive --json --output artifacts/p4-46-source-archive-final.zip
node tools/pskernel.ts verify-source-archive artifacts/p4-46-source-archive-final.json --json
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p46tar-final
node tools/pskernel.ts verify-release-manifest artifacts/p4-46-release-manifest-final.json --json --fresh
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p46tar-smoke-final
```

## Supported now

```txt
Deterministic release-critical source archive creation
Release archive verification against the fresh workspace source tree
Release manifest source-archive binding
Fresh-bound release verification of releaseArchiveSha256 / archive zip sha256 / payload sha256
Package/tarball inclusion of release-archive evidence docs
```

## Still not claimed

```txt
Full Lean kernel equivalence
Formal proof of all proof obligations
Full Lean frontend/elaborator/parser independence
Heavy full-regeneration CI parity in all environments
```

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~93%
PSC-1 small complete programming language: ~60.7%
PSC-1 small theorem prover: ~58.9%
Full ProofScript compiler: ~54%
Full Lean-like ProofScript without Lean4: ~10.8%
Formal Lean 4 equivalence: 0 proven obligations
```
