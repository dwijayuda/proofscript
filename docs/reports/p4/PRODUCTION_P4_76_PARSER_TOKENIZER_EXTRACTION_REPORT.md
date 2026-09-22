# Production P4.76 — Parser Tokenizer Extraction

P4.76 performs the first behavior-preserving parser cleanup from the P4.75 roadmap.

## Change

- Extracted `tokenize(source: string): Token[]` from `packages/parser/src/index.ts` into `packages/parser/src/tokenize.ts`.
- Preserved the public API by re-exporting `tokenize` from `packages/parser/src/index.ts`.
- Added `tools/parser-tokenize-characterization-tests.ts` and `npm run test:parser:tokenize`.

## Trust boundary

No kernel rule, axiom, reduction rule, proof primitive, source syntax, or backend semantic behavior was added. This is a behavior-preserving cleanup. K3-TB remains trusted-boundary / not-proven. Formal Lean 4 equivalence remains 0 proven obligations.

## Verification tier

Fast cleanup tier: build, tokenizer characterization, standalone small smoke, kernel smoke, `pskernel status`, archive integrity.
