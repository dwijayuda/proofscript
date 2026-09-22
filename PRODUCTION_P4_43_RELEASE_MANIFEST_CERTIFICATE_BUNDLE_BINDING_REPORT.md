# P4.43 — Release Manifest Certificate-Bundle Binding

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Bind the P4.41/P4.42 deterministic certificate bundle evidence into the release-manifest/preflight path, so a published release manifest commits to the same artifact replay, certificate, environment snapshot, audit bundle, and proof-obligation catalog evidence chain.

## Changes

- `tools/pskernel-kernel-release-manifest.ts` now creates a fresh `pskernelCreateCoreCertificateBundle(...)` for the canonical smoke artifact.
- The release manifest now records:
  - `componentHashes.certificateBundleSha256`,
  - `componentHashes.certificateBundleVerificationSha256`,
  - `componentHashes.certificateBundleAuditSha256`,
  - `componentHashes.certificateBundleObligationsSha256`,
  - `componentHashes.certificateBundleEnvironmentSha256`.
- Added release-manifest checks for:
  - certificate bundle fresh verification,
  - deterministic repeated certificate-bundle generation,
  - audit-hash agreement between standalone audit bundle and certificate bundle,
  - obligation-catalog hash agreement between release obligations and certificate bundle.
- Added `verifyPSKernelKernelReleaseManifest(...)` for validating manifest shape, self hash, and optionally comparing against freshly regenerated deterministic evidence.
- Added CLI command:
  - `node tools/pskernel.ts verify-release-manifest <manifest.json> [--json|--pack-destination <dir>]`
- Extended heavy smoke expectations for certificate-bundle fields in release manifests.
- Added proof obligation:
  - `ProofScript.Release.Manifest.CertificateBundleBinding`.

## TDD result

RED:

```txt
release manifest should bind certificate bundle hash
actual: undefined
```

GREEN:

```txt
componentHashes.certificateBundleSha256 and related bundle hashes are present,
release manifest generation accepts,
and forged self-hash/tampered certificate-bundle hash manifests reject at verification shape gate.
```

## Verification evidence

Fresh commands run in this pass:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts release-manifest --json --pack-destination artifacts/p4-43-final-tarball
node tools/pskernel.ts verify-release-manifest /tmp/p4_43_manifest_final.json --json
node tools/pskernel.ts verify-release-manifest /tmp/p4_43_manifest_forged.json --json
```

`verify-release-manifest` defaults to `shape-and-self-hash` mode so reviewers can quickly verify a downloaded manifest's canonical self-hash and required certificate-bundle bindings. Passing `--fresh` asks it to regenerate package/tarball/replay evidence, which is intentionally heavier and may be reserved for release CI. Full accepted manifest generation was run and accepted; forged-manifest verification was run and rejected.

## Remaining caveat

This strengthens release evidence. It is still not a formal Lean 4 kernel-equivalence proof. The trust label remains trusted-boundary and all formal equivalence obligations remain not proven.


## Observed final hashes

```txt
releaseManifestSha256=5de43d5c2d8162b6469dfa2e4282ee30ce3599d44f3510e36d1f91a8b2112bc4
certificateBundleSha256=2e24c317c5e5d98df7f35c11b8e5b782902b151c2648c0cfacc5da5210f27d4d
certificateBundleAuditSha256=9c3e1048eba6071bb076059311710ab52209f15c4a3dc48bcb9fb854830611a1
certificateBundleObligationsSha256=a7bfd2dd7c41377efcb916335ae9db4bbcce85b2cff00cd5bf650d8915333e9e
certificateBundleEnvironmentSha256=60ae4d840beb515016710e003b45ed8adc771cc1c2d38a87f99b3d6aef936f0d
```

## Progress after P4.43

```txt
Standalone PSC-1 without Lean4: ~92%
PSC-1 small complete programming language: ~60.5%
PSC-1 small theorem prover: ~58%
Full ProofScript compiler: ~53%
Full Lean-like ProofScript without Lean4: ~10.5%
Formal Lean 4 equivalence: 0 proven obligations
```
