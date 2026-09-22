# P4.78 Parser Sugar Extraction Report

## Summary

P4.78 is a behavior-preserving cleanup/refactor slice. It extracts common parser sugar/lowering constructors from `packages/parser/src/index.ts` into `packages/parser/src/sugar.ts`.

## Scope

Created:

- `packages/parser/src/sugar.ts`
- `tools/parser-sugar-extraction-tests.ts`
- `docs/reports/p4/PRODUCTION_P4_78_PARSER_SUGAR_EXTRACTION_REPORT.md`

Modified:

- `packages/parser/src/index.ts`
- `packages/parser/README.md`
- `README.md`
- `package.json`

## Extracted helpers

- `makeGlobalName(name)`
- `makeApp(fn, args, explicit?)`
- `makeNatAdd(left, right)`
- `makeNatMul(left, right)`
- `makeBoolIf(condition, thenBranch, elseBranch)`
- `makeBoolAnd(left, right)`
- `makeBoolOr(left, right)`

## Trust-boundary statement

No proof rules changed. No kernel primitive was added. No runtime or backend behavior was deliberately changed. This refactor only names and isolates existing source-sugar lowering patterns before elaboration/kernel checking.

## Verification

Fast verification was used for cleanup velocity:

- `npm run build -- --pretty false`
- `npm run test:parser:sugar`
- `npm run test:parser:cursor`
- `npm run test:parser:tokenize`
- `npm run test:pslive:language-fast`
- `npm run test:standalone-small`
- `npm run test:kernel:smoke`
- `node tools/pskernel.ts status --json`
- `unzip -tq proofscript-standalone-kernel-maturity-replacement-p4-78.zip`

`npm run verify:k3tb:publish` was not rerun because this environment still lacks `PROOFSCRIPT_LEAN_BIN`.
