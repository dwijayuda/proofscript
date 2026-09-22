# Production P4.23 — pskernel TypeScript Kernel Package Audit Report

## Summary

This phase adds a publish-oriented package audit gate for the pskernel-derived
TypeScript kernel.  The goal is to ensure the npm package contents carry the
standalone trust evidence, not only the compiled JavaScript entrypoints.

Trust label remains: **trusted-boundary standalone kernel; not fully formally
equivalent to Lean 4 yet**.

## Changes

- Added `tools/pskernel-kernel-package-audit.ts`.
- Added `pskernel package-audit` CLI command.
- Added npm scripts:
  - `npm run package-audit:pskernel-kernel`
  - `npm run package-audit:pskernel-kernel:json`
  - `npm run package-audit:pskernel-kernel:write-docs`
- Updated `packages/kernel/package.json` so npm package contents include:
  - `dist/`
  - `README.md`
  - `docs/`
- Updated `tools/copy-static-assets.ts` to copy release evidence into
  `packages/kernel/docs/`:
  - `TRUST_BOUNDARY.md`
  - `PROOF_OBLIGATIONS.md`
  - `PSKERNEL_TS_PORTING_MAP.md`
  - `PSKERNEL_TS_PHASE_PLAN.md`
  - `PSKERNEL_TS_RELEASE_PREFLIGHT.json`
  - `PSKERNEL_TS_PROOF_OBLIGATIONS.json`
- Updated release preflight to include the package audit as a required gate.
- Updated smoke tests to exercise `pskernel package-audit --json`.
- Added proof obligation `ProofScript.ReleasePackage.NpmContentsAudit`.
- Updated `pskernelStatusReport()` progress estimate to `99%` and included npm
  package audit in supported slices.

## Package audit checks

The package audit verifies:

- active package name remains `@proofscript/kernel`;
- package entrypoints are `dist/index.js` and `dist/index.d.ts`;
- npm package allowlist includes `dist`, `README.md`, and `docs`;
- built entrypoints exist locally;
- kernel docs/evidence files exist under `packages/kernel/docs`;
- `npm pack --dry-run --json` includes the dist tree and evidence docs;
- legacy compact-kernel files are excluded from the package contents.

## Fresh verification

```bash
npm run build -- --pretty false
npx tsc -b --force --pretty false
node tools/copy-static-assets.ts
npm run test:kernel:smoke
npm run pskernel -- status
node tools/pskernel.ts status --json
node tools/pskernel.ts check-core artifacts/pskernel-cli-check-core-smoke.json cli-smoke
node tools/pskernel.ts certify artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts verify-cert artifacts/pskernel-cli-verify-cert-smoke.json
node tools/pskernel.ts obligations --json
node tools/pskernel.ts audit artifacts/pskernel-cli-certify-smoke.json
node tools/pskernel.ts preflight
node tools/pskernel.ts preflight --json
node tools/pskernel.ts package-audit
node tools/pskernel.ts package-audit --json
node tools/pskernel.ts package-audit --json --pack-destination artifacts
```

## Results

- build: PASS
- forced TypeScript rebuild: PASS
- copy static assets: PASS
- kernel smoke: PASS
- pskernel status: PASS
- pskernel status --json: PASS
- pskernel check-core: PASS
- pskernel certify: PASS
- pskernel verify-cert: PASS
- pskernel obligations --json: PASS
- pskernel audit: PASS
- pskernel preflight: PASS
- pskernel preflight --json: PASS
- pskernel package-audit: PASS
- pskernel package-audit --json: PASS
- pskernel package-audit --json --pack-destination artifacts: PASS

## Evidence

- Package audit checks: 22
- Package audit failures: 0
- Package audit SHA-256:
  `3d6ecd11484446a0ab250eec16acb6d9a1f6f8f85c14ffb2861dfd443cb80762`
- Preflight checks after package-audit integration: 25
- Preflight failures: 0
- Preflight SHA-256:
  `0ecb5259ade2927210f3756836c6d26a20a8b746c697f8e77313fcffc5c8eee7`
- Packed npm artifact:
  `artifacts/proofscript-kernel-0.1.0-dev.0.tgz`
- Packed file count: 472
- Packed size: 123229 bytes
- Packed unpacked size: 782521 bytes

## Progress

- Previous overall: ~98%
- Current overall: ~99%

Phase status:

- Phase 2: ~99% complete
- Phase 3: ~99% started
- Phase 4: ~99% started
- Phase 5: ~86% started
- Phase 6: ~96% started
- Phase 9: ~90% started via proof-obligation, audit, preflight, and package evidence

## Remaining work

Still not claimed:

- full formal Lean 4 equivalence;
- full parser/elaborator/macro/tactic system;
- full native `.olean` replay;
- general indexed/mutual/nested inductive recursors;
- String/UInt/Float logical-runtime semantics.
