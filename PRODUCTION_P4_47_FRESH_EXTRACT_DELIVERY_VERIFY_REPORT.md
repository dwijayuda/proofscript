# P4.47 — Fresh-Extract Delivery Verification and Local Workspace Bootstrap

## Status

Accepted in the local sandbox verification path.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## Root cause found

A fresh extraction of the P4.46 delivered zip had no `node_modules` workspace symlinks. `npm run build` could therefore invoke TypeScript before `@proofscript/*` package names were locally resolvable. The first RED check from a no-`node_modules` state failed with unresolved `@proofscript/kernel` / `@proofscript/parser` package references and downstream implicit-`any` errors.

## Change implemented

- Added `tools/link-local-workspaces.cts`.
- Updated `npm run build` so it first runs local workspace linking, then `tsc -b`, then static asset copying.
- Added `npm run bootstrap:local-workspaces`.
- Added `pskernel bootstrap-local-workspaces --json`.
- Added `tools/pskernel-kernel-delivery-verify.ts`.
- Added npm scripts:
  - `delivery-verify:pskernel-kernel`
  - `delivery-verify:pskernel-kernel:json`
  - `delivery-verify:pskernel-kernel:write-docs`
- Added `pskernel verify-delivery --json|--write-docs`.
- Added `docs/PSKERNEL_TS_DELIVERY_VERIFICATION.json` as root delivery evidence.
- Kept self-referential source-tree/delivery evidence out of the packaged kernel-doc evidence list to avoid circular source-tree hashes.

## What `verify-delivery` checks

`pskernel verify-delivery` runs one bounded delivery-chain verification from the extracted tree:

1. local workspace symlink bootstrap,
2. conservative trusted-boundary kernel status,
3. fresh source-tree evidence verification,
4. fresh release source-archive verification,
5. package audit,
6. tarball smoke,
7. fresh-bound release-manifest verification.

## TDD result

```txt
RED 1:
node tools/pskernel.ts delivery-verify --json
=> unknown pskernel command: delivery-verify

RED 2:
rm -rf node_modules && npm run build -- --pretty false
=> TypeScript could not resolve @proofscript/* workspace packages

GREEN:
node tools/link-local-workspaces.cts links 28 local @proofscript/* packages
npm run build now bootstraps local links before tsc
pskernel verify-delivery accepts with zero required failures
```

## Verification commands

```bash
rm -rf node_modules
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
node tools/pskernel.ts bootstrap-local-workspaces --json
node tools/pskernel.ts verify-delivery --json
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts tarball-smoke --json --pack-destination /tmp/p47tar-smoke-final
node tools/pskernel.ts verify-release-manifest artifacts/p4-47-release-manifest-final.json --json --fresh
```

## Result

```txt
build-from-no-node_modules: PASS
kernel smoke: PASS
standalone-small: PASS
reference-governance: PASS
governance: PASS
bootstrap-local-workspaces: accepted
verify-delivery: accepted, failures=0
package-audit: accepted, failures=0
tarball-smoke: accepted, runtime=accepted
verify-release-manifest --fresh: accepted, failures=0
```

## Remaining caveats

- The release is still a trusted-boundary standalone implementation, not a proof of full Lean kernel equivalence.
- `verify-delivery` is a bounded practical delivery verifier; it does not run the heavyweight `--fresh --heavy` path by default.
- Formal Lean 4 equivalence remains 0 proven obligations.

## Progress estimate

```txt
Standalone PSC-1 without Lean4: ~93.3%
PSC-1 small complete programming language: ~60.8%
PSC-1 small theorem prover: ~59.0%
Full ProofScript compiler: ~54.2%
Full Lean-like ProofScript without Lean4: ~10.9%
Formal Lean 4 equivalence: 0 proven obligations
```
## Observed final hashes

```txt
workspaceLinksSha256=8ed3f7ee0566f8e3ef849f65fb4d2ea31a063dc587358b690866d96a850beb10
deliveryVerificationSha256=4e3894f6619cb2286871868cff2d5144b9e3d302d0e34f796012db2bfe5a01d5
releaseManifestSha256=cef326d5c5cdb6b3a191c3acddf2a5455537dc5b47d237f982c0fd77680906fb
tarballSmokeSha256=9f93802d6d41f0f3c6301e0d43fd5fdd46d993e67fabd63be372f21b1756acf1
```
