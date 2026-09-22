# Production P4.77 Parser Cursor Extraction Report

## Summary

P4.77 continues the cleanup/refactor roadmap by extracting low-level parser token cursor state from `packages/parser/src/index.ts` into `packages/parser/src/tokenCursor.ts`.

This is a behavior-preserving parser refactor. It does not add syntax, does not change elaboration, does not add kernel primitives, and does not change the K3-TB trusted-boundary label.

## Motivation

After tokenizer extraction in P4.76, `packages/parser/src/index.ts` still owned both grammar logic and token navigation primitives (`at`, `atId`, `peek`, `next`, `expect`, `expectId`, `expectKind`). This made the parser file a higher-risk growth point because future declaration/expression/proof parser splits would still depend on private inline cursor mechanics.

## Changes

- Added `packages/parser/src/tokenCursor.ts`.
- Moved cursor index/token storage and expectation helpers into `TokenCursor`.
- Made `Parser` extend `TokenCursor`.
- Kept grammar, namespace state, section variables, declaration parsing, expression parsing, and proof parsing in `index.ts` for this slice.
- Added `tools/parser-cursor-extraction-tests.ts`.
- Added npm script `test:parser:cursor`.

## Verification

Fast verification was used for this cleanup slice:

```text
npm run build -- --pretty false        PASS
npm run test:parser:cursor             PASS
npm run test:parser:tokenize           PASS
npm run test:standalone-small          PASS
npm run test:kernel:smoke              PASS
node tools/pskernel.ts status --json  PASS, trusted-boundary / not-proven
```

## Trust Boundary

No trust-boundary upgrade is claimed.

- Kernel proof status remains `not-proven`.
- Formal Lean 4 equivalence obligations proven remain `0`.
- `TokenCursor` is parser infrastructure only.
- Proof validity still depends on checked Core/kernel/verifier paths, not parser helper location.

## Next Recommended Cleanup

P4.78 should split parser expression sugar/lowering helpers out of `packages/parser/src/index.ts`, especially Nat/Bool sugar builders and term start/stop helper logic.
