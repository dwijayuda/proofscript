# Governance Adoption Report — PSC-1 Standalone Cleanup

## Phase

P4.27 — Codebase cleanup and governance adoption.

## Status

Implemented as a fast-smoke milestone. This is not a full ProofScript architecture completion and does not prove Lean 4 equivalence.

## Changes

- Copied the governance/constitution bundle into `docs/constitution/`.
- Split PSC-1 executable runtime semantics out of `tools/pslive.ts` into `packages/runtime`.
- Split PSC-1 JavaScript emission out of `tools/pslive.ts` into `packages/backend-typescript`.
- Reduced `tools/pslive.ts` to a thin CLI/orchestration wrapper.
- Added `tools/governance-check.ts` as a fast governance compliance smoke gate.
- Added root scripts:
  - `npm run test:governance`
  - `npm run test:fast-smoke`
  - `npm run dev:smoke`
- Integrated governance checking into `node tools/pskernel.ts preflight`.
- Added `node tools/pskernel.ts governance`.

## Architecture boundary improvement

Before this cleanup, `tools/pslive.ts` mixed CLI parsing, frontend orchestration, JS backend emission, and runtime representation in one file.

After this cleanup:

```text
packages/runtime             owns PSC-1 runtime values and runtime-source emission
packages/backend-typescript  owns JS emission for checked Core artifacts
tools/pslive.ts             owns CLI parsing and orchestration only
packages/frontend            owns parse/elaborate/check pipeline
packages/kernel              remains the trusted core checker
```

## Trust policy

- Unsupported runtime/backend terms still fail closed.
- The kernel remains independent of parser/compiler/runtime/LSP packages.
- The project still uses the label: `trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet`.
- Proof obligations remain required for semantic stability.

## Minimal smoke commands

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:governance
node tools/pskernel.ts preflight
node tools/pskernel.ts governance
```

## Remaining cleanup

- Move more CLI behavior from tools into `packages/cli`.
- Move package-audit/preflight/release-manifest scripts into a dedicated release package later.
- Keep legacy K3-TB reports as evidence, but avoid restoring the old compact kernel as active code.
