# ProofScript P4.81 Backend TypeScript Emitter Extraction Report

## Status

P4.81 is a behavior-preserving cleanup/refactor slice. It does not change the K3-TB trusted boundary, kernel rules, theorem rules, or the PSC-1 language surface.

## Goal

Reduce spaghetti risk in `packages/backend-typescript/src/index.ts` by splitting mixed responsibilities into focused modules while keeping the public backend API stable:

- `emitJavaScriptModule(artifact, options)`
- `emitTypeScriptModule(artifact, options)`

## Changes

Before P4.81:

```text
packages/backend-typescript/src/index.ts
  public API types
  name sanitization
  term-shape helpers
  executable term emission
  declaration analysis
  module template emission
```

After P4.81:

```text
packages/backend-typescript/src/index.ts
  thin public API wrapper and type re-exports

packages/backend-typescript/src/types.ts
  public result/options interfaces plus internal emitter context types

packages/backend-typescript/src/names.ts
  reserved JS/TS/CommonJS/runtime binding set
  sanitizeName
  buildSanitizedNameMap

packages/backend-typescript/src/termEmitter.ts
  flattenPi / flattenApp
  executable Core term emission
  Nat/Bool/structure/recursor executable lowering

packages/backend-typescript/src/declarationAnalysis.ts
  constructor/projection/recursor discovery
  user declaration slicing
  executable/non-executable declaration classification

packages/backend-typescript/src/moduleEmitter.ts
  JavaScript and TypeScript module assembly
  runtime source embedding
  source/trust metadata
```

## Line-count shape

```text
packages/backend-typescript/src/index.ts                  8 lines
packages/backend-typescript/src/names.ts                 36 lines
packages/backend-typescript/src/declarationAnalysis.ts   69 lines
packages/backend-typescript/src/types.ts                 71 lines
packages/backend-typescript/src/termEmitter.ts          146 lines
packages/backend-typescript/src/moduleEmitter.ts        154 lines
```

The backend now has smaller, reviewable files instead of one mixed emitter file.

## Verification summary

Fast cleanup verification was run after implementation:

```text
npm run build -- --pretty false                 PASS
npm run test:backend-typescript:extraction      PASS
npm run test:pslive:build-ts                    PASS
npm run test:pslive:cleanup-harness             PASS
npm run test:pslive:js-name-collision           PASS
npm run test:pslive:reserved-identifiers        PASS
npm run test:standalone-small                   PASS
npm run test:kernel:smoke                       PASS
node tools/pskernel.ts status --json           PASS, trusted-boundary / not-proven
```

Not rerun:

```text
npm run verify:k3tb:publish            NOT RERUN; still needs PROOFSCRIPT_LEAN_BIN
full long matrix                       NOT RERUN; skipped for fast cleanup iteration
```

## Trust boundary

No backend file is a proof authority. The backend still consumes already-checked Core artifacts and emits executable JS/TS only. Kernel validity remains in `packages/kernel` / verifier paths.

## Progress after P4.81

```text
Standalone PSC-1 without Lean4:                 ~97.3%
PSC-1 small complete programming language:      ~72.0%
PSC-1 small theorem prover:                     ~62.1%
Full ProofScript compiler:                      ~61.5%
Full Lean-like ProofScript without Lean4:       ~13.8%
Formal Lean 4 equivalence:                      0 proven obligations
Maintainability / anti-spaghetti score:         ~72%
```

## Fresh extracted archive smoke

The release ZIP was created with symlink preservation and checked from a clean extraction:

```text
unzip -tq P4.81 archive                                      PASS
fresh extract: npm run build -- --pretty false               PASS
fresh extract: npm run test:backend-typescript:extraction    PASS
fresh extract: node tools/pskernel.ts status --json         PASS, trusted-boundary / not-proven
```
