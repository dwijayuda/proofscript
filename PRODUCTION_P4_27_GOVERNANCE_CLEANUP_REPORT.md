# Production P4.27 — Governance Cleanup Report

## Phase

P4.27 — Codebase cleanup following the ProofScript governance/constitution bundle.

## Status

Accepted by fast smoke gates. This milestone improves architecture boundaries for the PSC-1 standalone path; it does not claim full ProofScript, full Lean compatibility, or formal Lean 4 kernel equivalence.

## Files created

- `packages/runtime/package.json`
- `packages/runtime/tsconfig.json`
- `packages/runtime/README.md`
- `packages/runtime/src/index.ts`
- `packages/backend-typescript/package.json`
- `packages/backend-typescript/tsconfig.json`
- `packages/backend-typescript/README.md`
- `packages/backend-typescript/src/index.ts`
- `tools/governance-check.ts`
- `docs/constitution/*.md`
- `docs/GOVERNANCE_ADOPTION_REPORT.md`
- `docs/GOVERNANCE_COMPLIANCE_SMOKE.json`
- `PRODUCTION_P4_27_GOVERNANCE_CLEANUP_REPORT.md`

## Files changed

- `tools/pslive.ts`
- `tools/pskernel.ts`
- `tools/pskernel-kernel-preflight.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

## Cleanup performed

Before this phase, `tools/pslive.ts` mixed several layers in one script:

- CLI parsing;
- source check orchestration;
- JavaScript backend emission;
- PSC-1 runtime encoding;
- trust/status metadata.

After this phase:

```text
packages/runtime             owns PSC-1 executable value representation and runtime-source emission
packages/backend-typescript  owns JavaScript emission for already-checked Core artifacts
tools/pslive.ts             owns only CLI orchestration
packages/frontend            owns parse/elaborate/check orchestration
packages/kernel              remains the trusted core checker
```

## Governance rules enforced

Added `tools/governance-check.ts`, which checks:

- constitution docs are present in `docs/constitution`;
- required fast-development scripts exist;
- required package boundaries exist;
- `packages/runtime` and `packages/backend-typescript` participate in the root TypeScript build;
- exactly one active `@proofscript/kernel` package exists;
- kernel does not import parser/compiler/runtime/frontend/backend/LSP packages;
- runtime does not import kernel/parser/frontend/compiler packages;
- parser does not import backend/runtime/compiler/kernel packages;
- TypeScript backend does not depend on frontend/parser/elaborator/CLI;
- `tools/pslive.ts` no longer contains backend/runtime god-file markers;
- old compact K3-TB kernel remains legacy-only and absent from active kernel dist.

## Commands run

```bash
npm install --ignore-scripts --silent
npm run build -- --pretty false
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts tarball-smoke
node tools/pskernel.ts release-manifest
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

## Results

```text
build: PASS
test:fast-smoke: PASS
kernel smoke: PASS
standalone small smoke: PASS
governance check: PASS
preflight: PASS
package audit: PASS
tarball smoke: PASS
release manifest: PASS
pslive add2(5): 7
```

## Evidence

```text
governanceSha256=07d604d973d1d0da10dc7d5847718e8782a2e9fcfba44cd958862f38dcf648e9
preflightSha256=f5ca0b2ca411d172f55cff1314ba5d9b7e2f67f5eb1c58e30e95756970f3dda2
packageAuditSha256=8a3697fed5efb0f3bec4e8ef99cf33575c0eabe4016dca87fd7871e61f1b72a0
tarballSmokeSha256=bcc9f8c97b11baca641e4407d9cbdee86453150ad186c01ef809d4e00f94e747
releaseManifestSha256=d326e75af4109d6ca336e3ea548f51e62c37244d10cd75d495964db974157600
```

## Supported features preserved

- PSC-1 small standalone `.ps` checking without Lean4;
- Nat/Bool/Unit/Eq checked bootstrap prelude;
- Nat literals;
- simple definitions and curried Nat functions;
- standalone JS emission;
- standalone JS execution smoke;
- kernel smoke/preflight/package/tarball/release evidence.

## Unsupported / fail-closed features preserved

- full Lean parser;
- dynamic syntax/macros;
- tactic elaboration;
- full typeclass search;
- general recursion execution;
- String/UInt/Float runtime semantics;
- full Lean compatibility;
- formal Lean 4 equivalence.

## Trust label

```text
trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet
```

## Next phase

P4.28 should continue cleanup by moving more ad-hoc release/preflight scripts into a dedicated package, or by expanding PSC-1 with one small source feature while preserving this architecture boundary discipline.
