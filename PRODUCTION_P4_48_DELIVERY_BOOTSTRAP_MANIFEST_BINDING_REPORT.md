# P4.48 — Delivery-bootstrap release-manifest binding

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Goal

Bind fresh-extract delivery evidence into the release manifest without introducing a circular dependency between `verify-delivery` and `release-manifest`.

P4.47 added full delivery verification, but the release manifest did not bind a delivery-bootstrap hash. Binding the full delivery verification directly would create a cycle because full delivery verification itself runs release-manifest fresh verification. P4.48 fixes this by introducing a smaller manifestless delivery-bootstrap evidence layer.

## TDD result

RED:

```txt
release manifest should bind manifestless delivery-bootstrap verification hash
actual: undefined
```

GREEN:

```txt
release manifest componentHashes.deliveryBootstrapSha256 is present;
componentSummaries.deliveryBootstrap is present;
verify-release-manifest --fresh recomputes deliveryBootstrapSha256;
forged deliveryBootstrapSha256 rejects.
```

## Files added

```txt
tools/pskernel-kernel-delivery-bootstrap.ts
tools/release-manifest-delivery-binding-tests.ts
```

## Files changed

```txt
package.json
tools/pskernel.ts
tools/pskernel-kernel-release-manifest.ts
tools/pskernel-kernel-delivery-verify.ts
tools/pskernel-kernel-package-audit.ts
tools/pskernel-kernel-tarball-smoke.ts
tools/copy-static-assets.ts
packages/kernel/src/PSKernel/Verify/Obligations.ts
docs/PROOF_OBLIGATIONS.md
docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json
docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json
PSKERNEL_TS_KERNEL_REWRITE_REPORT.md
```

## New commands

```bash
node tools/pskernel.ts delivery-bootstrap --json
node tools/pskernel.ts delivery-bootstrap --json --write-docs
node tools/pskernel.ts delivery-bootstrap --json --output <zip>
npm run delivery-bootstrap:pskernel-kernel
npm run delivery-bootstrap:pskernel-kernel:json
npm run delivery-bootstrap:pskernel-kernel:write-docs
npm run test:release-manifest-delivery-binding
```

## Evidence bound by delivery-bootstrap

```txt
workspaceLinksSha256
statusReportSha256
sourceTreeSha256
releaseArchiveSha256
releaseArchiveZipSha256
releaseArchivePayloadSha256
deliveryBootstrapSha256
```

## Release-manifest integration

`runPSKernelKernelReleaseManifest(...)` now records:

```txt
componentHashes.deliveryBootstrapSha256
componentSummaries.deliveryBootstrap
```

`verifyPSKernelKernelReleaseManifest(..., { fresh: true })` now recomputes the same manifestless bootstrap hash and rejects mismatches.

## Package/tarball integration

The package audit and tarball smoke now require the package to include:

```txt
docs/PSKERNEL_TS_DELIVERY_BOOTSTRAP.json
```

## Proof obligation added

```txt
ProofScript.Release.Manifest.DeliveryBootstrapBinding
```

## Fresh verification

```bash
npm run build -- --pretty false
npm run test:release-manifest-delivery-binding
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts delivery-bootstrap --json --write-docs
node tools/pskernel.ts verify-delivery --json --write-docs
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p48tar-smoke
node tools/pskernel.ts release-manifest --json --pack-destination /tmp/p48manifest-pack
node tools/pskernel.ts verify-release-manifest /tmp/p48_manifest.json --json --fresh --pack-destination /tmp/p48manifest-fresh
```

## Current status

```txt
build: PASS
delivery-bootstrap: PASS
test:release-manifest-delivery-binding: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS
governance: PASS
package-audit: PASS
tarball-smoke: PASS
release-manifest: PASS
verify-release-manifest --fresh: PASS
verify-delivery: PASS
```

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~93.5%
PSC-1 small complete programming language: ~60.8%
PSC-1 small theorem prover: ~59.1%
Full ProofScript compiler: ~54.3%
Full Lean-like ProofScript without Lean4: ~11.0%
Formal Lean 4 equivalence: 0 proven obligations
```
