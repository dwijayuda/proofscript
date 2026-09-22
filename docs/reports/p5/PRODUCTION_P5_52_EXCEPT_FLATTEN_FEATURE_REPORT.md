# P5.52 Except.flatten Feature Report

P5.52 adds explicit `Except.flatten(E, A, value)` as a checked-bootstrap PSC-1 helper.

## Semantics

`Except.flatten(E, A, value): Except(E, A)` collapses one nested `Except` layer while preserving the same error type:

- `Except.flatten(E, A, Except.ok(E, Except(E, A), Except.ok(E, A, x)))` returns `Except.ok(E, A, x)`.
- `Except.flatten(E, A, Except.ok(E, Except(E, A), Except.error(E, A, e)))` returns `Except.error(E, A, e)`.
- `Except.flatten(E, A, Except.error(E, Except(E, A), e))` returns `Except.error(E, A, e)`.

The helper intentionally covers the same-error-type flattening shape only: `Except(E, Except(E, A)) -> Except(E, A)`.

## Implementation

The feature is implemented as a checked bootstrap definition over existing `Except.rec`. JavaScript and TypeScript emission route already checked Core calls through `__ps.Except_flatten` for executable PSC-1 output.

The implementation also preserves the P5.52 elaborator cleanup: array literal and Option/Except do-notation lowering live in `packages/elaborator/src/arrayDoElaboration.ts`, keeping `packages/elaborator/src/index.ts` smaller without changing the kernel.

## Trust boundary

No kernel source changes, no kernel refactor, no new primitive reduction rule, and no full Lean 4 equivalence claim are introduced. The project remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.

## Evidence

- `tools/pslive-except-flatten-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/std/bootstrap-manifest.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `packages/elaborator/src/arrayDoElaboration.ts`
- `tools/k1d-foundation-tests.ts`
- `npm run test:pslive:except-flatten`
- `npm run test:p5:baseline`
- `npm run test:architecture`
- `npm run test:typescript-migration`
- `npm run test:conformance`
