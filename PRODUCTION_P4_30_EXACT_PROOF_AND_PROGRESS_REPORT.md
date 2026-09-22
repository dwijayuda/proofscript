# Production P4.30 — PSC-1 Exact Proof and Progress Report

## Summary

P4.30 advances the standalone ProofScript small subset from `rfl`-only proof blocks to a second proof construct: `by { exact term }`.

The feature is deliberately small. It does not introduce a tactic framework. It parses one canonical proof-block form, elaborates the supplied term against the expected theorem/example goal, and lets the kernel check the resulting Core declaration.

## Changes

- Added `SurfaceTerm.exactProof`.
- Extended parser proof blocks from only `by { rfl }` to:
  - `by { rfl }`
  - `by { exact term }`
  - `by { exact rfl }`
- Added elaborator checking for exact proofs.
- Added positive standalone smoke with a theorem proved by exacting a previous theorem.
- Added negative standalone smoke where exacting a proof of `2 = 2` for a goal `2 = 3` is rejected.
- Added reference-governance smoke coverage for `exact`.
- Split smoke implementation from `tools/pslive.ts` into `tools/pslive-smoke-lib.ts`.
- Reduced `tools/pslive.ts` to 125 lines and cleared the governance warning.
- Added `docs/WORKING_LANGUAGE_PROGRESS.md`.

## Verification

Commands run:

```bash
npm run build -- --pretty false
npm run test:standalone-small
npm run test:reference-governance
npm run test:governance
npm run test:fast-smoke
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts release-manifest
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call add2 --args 5 --json
```

Result:

```text
build: PASS
standalone-small smoke: PASS
reference governance: PASS
governance: PASS, zero warnings
fast smoke: PASS
preflight: PASS
package audit: PASS
release manifest: PASS
pslive check: PASS
pslive run add2(5): 7
```

## Working Language Progress

See `docs/WORKING_LANGUAGE_PROGRESS.md` for current language coverage and next recommended milestones.

## Trust Boundary

This remains a trusted-boundary standalone small subset. P4.30 does not prove full Lean 4 equivalence and does not claim full ProofScript implementation coverage.
