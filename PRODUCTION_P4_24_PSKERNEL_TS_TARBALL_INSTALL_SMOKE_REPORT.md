# Production P4.24 — pskernel TypeScript Kernel Tarball Install Smoke Report

## Status

Accepted: the pskernel-derived trusted-boundary kernel now has an install-from-tarball smoke gate in addition to build, replay, certificate, audit, preflight, and npm package-content checks.

## Trust label

ProofScript pskernel-derived TypeScript kernel; trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet.

## What changed

- Added `tools/pskernel-kernel-tarball-smoke.ts`.
- Added `pskernel tarball-smoke` CLI command.
- Added npm scripts:
  - `tarball-smoke:pskernel-kernel`
  - `tarball-smoke:pskernel-kernel:json`
  - `tarball-smoke:pskernel-kernel:write-docs`
- Added tarball smoke to release preflight as `package.tarball-smoke`.
- Added tarball smoke checks to `tools/pskernel-kernel-smoke.ts`.
- Added generated evidence document `docs/PSKERNEL_TS_TARBALL_SMOKE.json`.
- Added `PSKERNEL_TS_PACKAGE_AUDIT.json` and `PSKERNEL_TS_TARBALL_SMOKE.json` to package docs copied into `packages/kernel/docs`.
- Strengthened package audit required docs so the npm package includes:
  - trust-boundary evidence;
  - proof-obligation evidence;
  - release preflight evidence;
  - package audit evidence;
  - tarball install-smoke evidence.
- Added proof obligation `ProofScript.ReleasePackage.InstallFromTarballSmoke`.
- Updated `pskernelStatusReport()` to list install-from-tarball smoke support.

## Tarball smoke behavior

The new gate:

1. builds/uses the active `@proofscript/kernel` package dist entrypoints;
2. runs `npm pack --workspace @proofscript/kernel --json`;
3. installs the produced `.tgz` into a fresh temporary project with `npm install --ignore-scripts --no-audit --no-fund`;
4. requires `@proofscript/kernel` from the installed package, not from the monorepo source tree;
5. runs runtime API smoke through installed dist:
   - `pskernelStatusReport()`;
   - `replayCoreArtifact(...)`;
   - `certifyCoreArtifact(...)`;
   - `verifyCoreReplayCertificate(...)`;
   - `checkCoreDeclarations(...)`;
   - `pskernelProofObligations()`.

## Fresh verification

Commands run:

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts tarball-smoke
node tools/pskernel.ts package-audit --json --pack-destination artifacts
```

Observed result:

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel preflight: PASS
pskernel package-audit: PASS
pskernel tarball-smoke: PASS
pskernel package-audit --pack-destination artifacts: PASS
```

Latest evidence snapshot:

```txt
preflight checks: 26
preflight failures: 0
package-audit checks: 26
package-audit failures: 0
tarball-smoke checks: 8
tarball-smoke failures: 0
proof obligations: 41
packed npm artifact: artifacts/proofscript-kernel-0.1.0-dev.0.tgz
packed file count: 474
packed size: 126184 bytes
```

## Current progress estimate

```txt
Previous overall: ~99%
Current overall: ~99% practical trusted-boundary release readiness
Phase 6 replay/CLI/package readiness: ~98%
Phase 9 proof-obligation/audit evidence: ~94%
Formal Lean 4 equivalence: still not claimed
```

## Remaining high-value work

- Prove obligations in Lean instead of only cataloging them.
- Deepen general indexed/mutual/nested inductive support.
- Add full standalone parser/elaborator/macro/tactic layers outside the kernel.
- Add formal equivalence bridge between TypeScript implementation and pskernel semantics.
