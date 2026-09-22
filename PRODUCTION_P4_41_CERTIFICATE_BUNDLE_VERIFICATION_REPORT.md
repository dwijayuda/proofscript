# P4.41 — Deterministic Certificate Bundle Verification

## Status

PASS — implemented and verified as a trusted-boundary evidence hardening slice.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

Bind replay evidence into a single deterministic certificate bundle that can be verified by fresh replay. P4.40 bound certificates to final environment snapshots; P4.41 packages the artifact, certificate, certificate-verification result, environment snapshot, and audit hash into one canonical bundle with its own SHA-256.

This is evidence, not a cryptographic signature and not a formal Lean-equivalence proof.

## Changes

### Kernel replay API

Changed `packages/kernel/src/PSKernel/Replay.ts`:

```txt
Added CoreReplayCertificateBundle
Added CoreReplayCertificateBundleVerification
Added CoreReplayCertificateBundleResult
Added validateEnvironmentSnapshot(...)
Added validateCoreReplayCertificateBundle(...)
Added createCoreReplayCertificateBundle(...)
Added verifyCoreReplayCertificateBundle(...)
```

The bundle contains:

```txt
format: proofscript-core-replay-certificate-bundle
version: 1
status: accepted
proofStatus: not-proven
trustLabel
semanticBaseline
artifact
certificate
certificateVerification
environmentSnapshot
auditSha256
bundleSha256
```

### Verification behavior

`verifyCoreReplayCertificateBundle(...)` now checks:

```txt
bundle format/version/status/trust label
artifact runtime validation
certificate runtime validation
environment snapshot runtime validation
environment snapshot self-hash
certificate.environmentSha256 == environmentSnapshot.environmentSha256
certificate verifies against bundled artifact by fresh replay
freshly recreated bundle equals supplied bundle under canonical serialization
bundleSha256 matches canonical bundle payload
```

Tampering with artifact, certificate, environment snapshot, audit hash, or bundle hash rejects.

### Main entry API

Changed `packages/kernel/src/Main.ts`:

```txt
Added pskernelCreateCoreCertificateBundle(...)
Added pskernelVerifyCoreCertificateBundle(...)
```

### CLI

Changed `tools/pskernel.ts`:

```txt
Added pskernel bundle <artifact.json>
Added pskernel verify-bundle <bundle.json>
```

### Proof obligation catalog

Changed `packages/kernel/src/PSKernel/Verify/Obligations.ts`:

```txt
Added ProofScript.Replay.CertificateBundle.DeterministicVerification
```

### Smoke tests

Changed `tools/pskernel-kernel-smoke.ts`:

```txt
createCoreReplayCertificateBundle accepts a replayable artifact
bundle exposes deterministic format marker
bundle exposes bundleSha256
bundle certificate hash equals environment snapshot hash
verifyCoreReplayCertificateBundle accepts fresh bundle
Main bundle creation and verification entries accept
forged bundleSha256 rejects
forged environmentSnapshot rejects
pskernel bundle CLI accepts
pskernel verify-bundle CLI accepts
```

## Verification commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts bundle artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts verify-bundle /tmp/p4_41_bundle.json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json
```

## Results

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

Observed verified bundle hash from CLI smoke:

```txt
005210a2421c8224ea8433955d97ed1c0f672e5843a855ff5caf7ee75de1b49b
```

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~91%
PSC-1 small complete programming language: ~60%
PSC-1 small theorem prover: ~57%
Full ProofScript compiler: ~52%
Full Lean-like ProofScript without Lean4: ~10%
Formal Lean 4 equivalence: 0 proven obligations
```

## Next best step

Continue with deterministic environment/replay diff evidence: add a `pskernel diff-snapshots` or `compare-certificates` command that reports exact changed declarations/constants when two certificate bundles differ, without broadening language acceptance.
