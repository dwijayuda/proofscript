# P5.58 Except.bimap Feature Report

P5.58 adds `Except.bimap(E, F, A, B, mapError, mapOk, value): Except(F, B)` as a checked-bootstrap PSC-1 helper.

## Semantics

- `Except.error(E, A, e)` maps to `Except.error(F, B, mapError(e))`.
- `Except.ok(E, A, x)` maps to `Except.ok(F, B, mapOk(x))`.

The definition is checked through existing `Except.rec` in `packages/std/src/Bootstrap/Foundation.ps`; the generated `packages/std/core/bootstrap.pscore.json` is replayed by the existing frontend/environment path. JavaScript and TypeScript emission route only checked Core applications to the runtime helper.

## Kernel impact

No kernel source, kernel-codec source, or trusted kernel profile was changed. This is not a formal Lean 4 equivalence proof and does not upgrade K3-TB to fully formal K3.

## Evidence

- `tools/pslive-except-bimap-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `packages/runtime/src/profile.ts`
- `packages/elaborator/src/coreTermElaboration.ts`
