# PRODUCTION P5.54 — Except.getErrorD Feature Report

## Summary

P5.54 promotes `Except.getErrorD(E, A, value, fallback): E` as a PSC-1 checked-bootstrap helper. It is implemented over the existing checked `Except.rec` bootstrap machinery and does not change the kernel.

## Semantics

- `Except.getErrorD(E, A, Except.error(E, A, e), fallback)` reduces to `e`.
- `Except.getErrorD(E, A, Except.ok(E, A, x), fallback)` reduces to `fallback`.

## Implementation

- Bootstrap source: `packages/std/src/Bootstrap/Foundation.ps`
- Checked Core artifact: `packages/std/core/bootstrap.pscore.json`
- Runtime helpers: `packages/runtime/src/source.ts`
- Backend routing: `packages/backend-typescript/src/termEmitter.ts`
- Focused test: `tools/pslive-except-geterrord-tests.ts`

## Elaborator refactor

P5.54 also extracts primitive-sugar elaboration from `packages/elaborator/src/index.ts` into `packages/elaborator/src/primitiveSugarElaboration.ts`, covering literal expected-type checks, `bif`, binary operator lowering, and universe-level lowering. This is behavior-preserving and not a kernel refactor.

## Trust boundary

This milestone remains K3-TB trusted-boundary. It is not fully formal K3, not full Lean 4 equivalence, and adds no formal Lean 4 equivalence proof. Formal Lean 4 equivalence proven obligations remain 0.
