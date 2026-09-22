# PRODUCTION P4.84 Trust-Boundary Import Guard Report

## Summary

P4.84 adds a stricter trust-boundary import guard to keep the standalone ProofScript architecture honest after the parser, backend, runtime, and pslive cleanup work.

This is cleanup/architecture hardening only. It does not change ProofScript syntax, Core semantics, kernel rules, JS/TS emission semantics, or theorem checking behavior.

## Problem

`tools/check-boundaries.ts` already rejected obvious `@proofscript/*` imports in trusted packages, but it did not reject relative imports that escaped a trusted package by filesystem path, for example from `packages/kernel/src` into `packages/runtime/src`.

That means a future fast edit could accidentally make the trusted kernel depend on execution/runtime/backend/plugin code without the architecture test noticing it.

## Change

`tools/check-boundaries.ts` now detects:

- static `import ... from "..."`
- side-effect `import "..."`
- `export ... from "..."`
- dynamic `import("...")`
- CommonJS `require("...")`
- `@proofscript/*` package aliases
- relative imports that resolve into another package or plugin area

The guard now enforces these core rules:

- `packages/kernel/src` is self-contained and must not import any other ProofScript package.
- `packages/verifier/src` may depend only on `@proofscript/kernel`, `@proofscript/kernel-codec`, and `@proofscript/certificates` by package alias, and may not escape to other package sources by relative path.
- `packages/kernel-codec/src` may depend on `@proofscript/kernel` but not runtime/backend/plugin layers.
- `packages/certificates/src` remains standalone from ProofScript package imports.
- `packages/plugin-api/src` and plugins must not import or reach the trusted kernel directly.
- trusted packages must not reach runtime, backend-typescript, plugin-api, or plugin-host through relative imports.

## Regression coverage

Added:

```bash
node tools/trust-boundary-relative-import-tests.ts
npm run test:architecture:trust-boundary
```

The regression creates a temporary fixture where `packages/kernel/src/Bad.ts` imports `../../runtime/src/index`. The old guard passed that fixture incorrectly. The new guard rejects it with a boundary diagnostic.

## Verification

Fresh verification run in P4.84:

```bash
npm run build -- --pretty false
npm run test:architecture:trust-boundary
npm run test:architecture
npm run test:runtime:extraction
npm run test:backend-typescript:extraction
npm run test:reference-governance:json
npm run test:governance
npm run test:standalone-small
npm run test:kernel:smoke
node tools/pskernel.ts status --json
```

All listed checks passed in the working tree.

## Trust boundary

No new trusted proof rule was added. This work protects the existing trust boundary from accidental dependency drift.

The release remains **K3-TB trusted-boundary**, not fully formal K3, and not proven equivalent to Lean 4.
