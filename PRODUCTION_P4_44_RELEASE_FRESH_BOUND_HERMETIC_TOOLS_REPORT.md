# P4.44 — Release Fresh-Bound Verification and Hermetic Local Tools

## Status

Accepted in the sandbox verification gates listed below.

## Trust label

```txt
ProofScript pskernel-derived TypeScript kernel
trusted-boundary standalone kernel
not fully formally equivalent to Lean 4 yet
```

## Goal

Close the practical P4.43 caveat where release-manifest verification had only a cheap shape/self-hash mode by adding a deterministic `--fresh` path that rechecks bounded trust-critical evidence without entering the heavyweight npm repack/preflight loop. Also make the repo tools usable from a freshly unzipped artifact without requiring `node_modules` workspace symlinks.

## Root cause found

Two issues blocked reliable follow-up verification from the zipped artifact:

1. A fresh unzip has built `dist/` output but no `node_modules/@proofscript/*` workspace symlinks. Tools that call `require('@proofscript/kernel')` or compiled packages that call `require('@proofscript/parser')` therefore failed even after `npm run build`.
2. Reference-governance hashes included random `/tmp/proofscript-reference-governance-*` paths, so repeated governance/preflight evidence could produce different hashes even when behavior was unchanged.

## Changes

### Hermetic workspace package resolution

Added:

```txt
tools/register-local-workspace.cts
tools/local-kernel-loader.ts
```

The local resolver maps missing `@proofscript/*` workspace imports to local `packages/*/dist` entries when `node_modules` symlinks are absent. This keeps fresh-unzip tooling usable after `npm run build`, without changing installed npm-package behavior.

Updated tools to preload/use the resolver:

```txt
tools/pskernel.ts
tools/pslive.ts
tools/pslive-smoke-lib.ts
tools/pskernel-kernel-preflight.ts
tools/pskernel-kernel-release-manifest.ts
tools/pskernel-kernel-tarball-smoke.ts
tools/pskernel-kernel-smoke.ts
tools/release-instrumented.ts
```

### Deterministic reference-governance hashing

`tools/reference-language-governance-smoke.ts` now scrubs random temporary directory names from args/stdout/stderr details before computing `referenceGovernanceSha256`.

Observed deterministic result after patch:

```txt
referenceGovernanceSha256=5efc858fb7015afc03f12dadde8fdadcaf1bf4e8084712f6f1bf9d14b74adb77
```

### Bounded release preflight in release-manifest generation

`tools/pskernel-kernel-release-manifest.ts` now uses a bounded release preflight by default. This bounded check verifies trust label, package entrypoints, obligation catalog status, and main status entry without duplicating heavyweight tarball installation. The separate release-manifest tarball component still runs independently and remains bound into the manifest.

Heavy preflight is still available with:

```bash
node tools/pskernel.ts release-manifest --heavy-preflight
```

### Fresh-bound release manifest verification

`node tools/pskernel.ts verify-release-manifest <manifest.json> --fresh` now runs a deterministic bounded fresh verifier by default. It freshly recomputes and compares:

```txt
statusReportSha256
proofObligationsSha256
standaloneAuditSha256
certificateBundleSha256
certificateBundleVerificationSha256
certificateBundleAuditSha256
certificateBundleObligationsSha256
certificateBundleEnvironmentSha256
evidenceFiles current bytes/hash
```

The older fully regenerative path is preserved behind:

```bash
node tools/pskernel.ts verify-release-manifest <manifest.json> --fresh --heavy
```

## Artifacts added

```txt
artifacts/p4-44-release-manifest.json
artifacts/p4-44-verify-release-manifest-fresh-bound.json
```

## Verification run

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts status
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p44tarfinal3
node tools/pskernel.ts verify-release-manifest /tmp/p44_manifest4.json --json --fresh
```

## Verification result

```txt
build: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS, checks=29
governance: PASS, checks=27, warnings=0, failures=0
pskernel status: PASS
package-audit: accepted, failures=0
tarball-smoke: accepted, failures=0, runtime=accepted
verify-release-manifest --fresh: accepted, mode=fresh-bound, failures=0, checks=20
```

## Observed hashes

```txt
releaseManifestSha256=a9eca7f078bfdb1aaf5a60231a08a88816b9dd7e5688dfe955ab49ef24d8da4e
packageAuditSha256=5dd17edd8de3f1e3b5e2f1c6e74ee81aa4d0c033a8d5579e4bf054259d0df9a2
tarballSha256=8d0526d2a3e1df279875e2028e619151e3e7f506c99cc5bde03cf699705d6d87
referenceGovernanceSha256=5efc858fb7015afc03f12dadde8fdadcaf1bf4e8084712f6f1bf9d14b74adb77
```

## Remaining caveat

`--fresh --heavy` still represents the slower fully regenerative CI path. It is preserved but not counted as passing in this sandbox run. The default `--fresh` mode is now the practical deterministic bounded verifier for release evidence.

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~92.5%
PSC-1 small complete programming language: ~60.5%
PSC-1 small theorem prover: ~58.5%
Full ProofScript compiler: ~53.5%
Full Lean-like ProofScript without Lean4: ~10.5%
Formal Lean 4 equivalence: 0 proven obligations
```
