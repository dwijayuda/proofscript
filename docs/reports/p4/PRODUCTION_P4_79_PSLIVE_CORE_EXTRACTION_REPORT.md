# P4.79 pslive Core Extraction Report

P4.79 is a behavior-preserving cleanup/refactor slice. It splits reusable ProofScript standalone live operations out of `tools/pslive.ts` into `tools/pslive-core.ts`.

## Changed Files

- `tools/pslive-core.ts`
- `tools/pslive.ts`
- `tools/pslive-core-extraction-tests.ts`
- `package.json`
- `README.md`
- `docs/reports/p4/PRODUCTION_P4_79_PSLIVE_CORE_EXTRACTION_REPORT.md`

## Responsibility Split

Before P4.79, `tools/pslive.ts` mixed:

- CLI usage and process exit behavior
- option parsing
- bootstrap loading
- frontend checking
- JS/TS emission
- temporary runtime execution
- JSON/text result shape construction

After P4.79:

- `tools/pslive.ts` owns CLI dispatch, usage text, output formatting, and exit codes.
- `tools/pslive-core.ts` owns reusable status/check/build-js/build-ts/run operations.
- `tools/pslive-core-extraction-tests.ts` verifies the core API directly without shelling through the CLI.

## Trust Boundary

No proof rule, parser behavior, kernel primitive, or backend semantics was intentionally changed. This is an anti-spaghetti refactor for the command layer only. ProofScript remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Fresh verification for this slice:

- Red test before implementation: `node tools/pslive-core-extraction-tests.ts` failed with `ERR_MODULE_NOT_FOUND` for `tools/pslive-core.ts`.
- `npm run build -- --pretty false`
- `npm run test:pslive:core`
- `npm run test:pslive:build-ts`
- `npm run test:pslive:bool-operators`
- `npm run test:standalone-small`
- `npm run test:kernel:smoke`
- `node tools/pskernel.ts status --json`
- `unzip -tq proofscript-standalone-kernel-maturity-replacement-p4-79.zip`

## Follow-up

P4.80 should consolidate duplicated pslive test harness code across the many `tools/pslive-*-tests.ts` scripts.
