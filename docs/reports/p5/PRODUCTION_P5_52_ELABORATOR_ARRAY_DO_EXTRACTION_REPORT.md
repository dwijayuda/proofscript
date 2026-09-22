# P5.52 Elaborator Array/Do Extraction Report

P5.52 analyzes `packages/elaborator/src/index.ts` and performs a bounded behavior-preserving extraction. Array literal lowering and Option/Except do-notation lowering now live in `packages/elaborator/src/arrayDoElaboration.ts`.

## Result

- `packages/elaborator/src/index.ts`: about 989 lines after extraction.
- `packages/elaborator/src/arrayDoElaboration.ts`: about 147 lines.
- Extracted concerns: array literal lowering, monad expected-shape recognition, Option do-bind lowering, Except do-bind lowering.

## Trust boundary

No kernel files are changed. The refactor preserves existing Core lowering behavior and keeps public elaborator entry points stable.

## Evidence

- `npm run build -- --pretty false`
- `npm run test:architecture`
- `npm run test:p5:baseline`
- `npm run test:pslive:except-flatten`
- `node tools/k1d-foundation-tests.ts`
