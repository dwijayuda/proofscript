# Production P4.22 — pskernel TypeScript Kernel Release Preflight Report

## Status

Accepted.

This phase adds a standalone release-preflight gate for the pskernel-derived TypeScript kernel. It does not expand the trusted semantics. It checks that the current standalone kernel package remains structurally auditable, mirror-complete against the recorded pskernel inventory, conservative in proof claims, and deterministic in replay/audit evidence.

## Trust label

`trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet`

## Why this phase

At the previous phase, the kernel had replay certificates, certificate verification, machine-readable proof obligations, and an audit bundle. The remaining high-value work before more semantics is a release-readiness gate that catches accidental regressions in the active package boundary:

- missing pskernel mirror files;
- missing `portStatus` metadata;
- accidental proof-status overclaim;
- stale compact-kernel dist files returning to the active package;
- broken proof-obligation catalog;
- nondeterministic audit output;
- missing CLI access to the release gate.

## Files created

```txt
 tools/pskernel-kernel-preflight.ts
 docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json
 kernel-status-pskernel-ts.json
 PRODUCTION_P4_22_PSKERNEL_TS_RELEASE_PREFLIGHT_REPORT.md
```

## Files changed

```txt
 package.json
 tools/pskernel.ts
 tools/pskernel-kernel-smoke.ts
 packages/kernel/src/PSKernel.ts
 packages/kernel/src/Main.ts
 packages/kernel/src/PSKernel/Verify/Obligations.ts
 docs/PSKERNEL_TS_PORTING_MAP.md
 docs/PSKERNEL_TS_PROOF_OBLIGATIONS.json
```

## New CLI/API surface

```bash
node tools/pskernel-kernel-preflight.ts
node tools/pskernel-kernel-preflight.ts --json
node tools/pskernel-kernel-preflight.ts --write-docs
node tools/pskernel.ts preflight
node tools/pskernel.ts preflight --json
node tools/pskernel.ts preflight --write-docs
npm run preflight:pskernel-kernel
npm run preflight:pskernel-kernel:json
npm run preflight:pskernel-kernel:write-docs
```

## Preflight checks

The preflight gate currently checks:

1. `docs/PSKERNEL_TS_PORTING_MAP.md` exists and has exactly 112 pskernel source rows.
2. Source Lean rows are unique.
3. Target TypeScript rows are unique.
4. Every mapped TypeScript target file exists.
5. Every mapped TypeScript target file declares `portStatus` metadata.
6. Every mapped target remains `proofStatus: "not-proven"`.
7. Target `source` metadata matches the porting map.
8. `packages/kernel/package.json` remains the active `@proofscript/kernel` package.
9. Package entrypoints still point at built `dist` files.
10. Legacy compact-kernel root dist files are absent from active `packages/kernel/dist`.
11. `pskernelStatusReport()` remains trusted-boundary / not-proven.
12. Status report still lists fail-closed slices.
13. Proof-obligation catalog validates.
14. Proof-obligation catalog contains no `proven` overclaim.
15. Standalone audit accepts the smoke artifact and verifies its certificate.
16. Standalone audit output is deterministic across repeated runs.

## Preflight result

```txt
PSKERNEL_TS_KERNEL_PREFLIGHT=PASS
checks=24
warnings=0
failures=0
preflightSha256=a220533b56d2cc1b657c16520fa090b446af9b6d18462e27c96ee99855dd26ed
```

## Proof obligations

Added one new obligation:

```txt
ProofScript.ReleasePreflight.MirrorAudit
```

Current catalog:

```txt
total: 39
lean-proof-target: 28
informal-spec: 11
not-proven: 39
proven: 0
```

## Fresh verification commands

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
npm run preflight:pskernel-kernel:write-docs
```

## Verification result

```txt
build: PASS
forced tsc rebuild: PASS
copy static assets: PASS
test:kernel:smoke: PASS
pskernel status: PASS
pskernel status --json: PASS
pskernel check-core: PASS
pskernel certify: PASS
pskernel verify-cert: PASS
pskernel obligations --json: PASS
pskernel audit: PASS
pskernel preflight: PASS
pskernel preflight --json: PASS
preflight write-docs: PASS
```

## Progress

```txt
Previous overall: ~96%
Current overall: ~98%

Phase 2: ~99% complete
Phase 3: ~99% started
Phase 4: ~99% started
Phase 5: ~86% started
Phase 6: ~94% started
Phase 9: ~82% started via proof-obligation/preflight evidence
```

## Remaining before stronger public claim

Still not claimed:

```txt
full Lean 4 kernel equivalence
full K3 formalization
general indexed recursor typing/reduction
mutual/nested/container positivity and recursors
full parser/elaborator/macro/tactic frontend
native .olean replay
String/UInt/Float/native literal semantics
```

## Next best step

The next best semantic step is either:

1. add a tiny safe `noConfusion` / constructor-disjointness boundary for simple inductives, or
2. add a final release lockfile that binds package files, docs, preflight JSON, proof obligations, and audit fixture hashes into one deterministic release manifest.

Given the current project goal of fast standalone readiness, option 2 is safer before public release; option 1 is better if the next milestone should be more kernel-semantics-heavy.
