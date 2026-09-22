# P5.51 Option.flatten Feature Report

P5.51 adds explicit `Option.flatten(A, value)` as a checked-bootstrap PSC-1 helper.

## Semantics

`Option.flatten(A, value): Option(A)` collapses one layer of `Option`:

- `Option.flatten(A, Option.some(Option(A), Option.some(A, x)))` returns `Option.some(A, x)`.
- `Option.flatten(A, Option.some(Option(A), Option.none(A)))` returns `Option.none(A)`.
- `Option.flatten(A, Option.none(Option(A)))` returns `Option.none(A)`.

## Implementation

The feature is implemented as a checked bootstrap definition over existing `Option.rec`. JavaScript and TypeScript emission route already checked Core calls through `__ps.Option_flatten` for executable PSC-1 output.

## Trust boundary

No kernel source changes, no kernel refactor, no new primitive reduction rule, and no full Lean 4 equivalence claim are introduced. The project remains K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence proven obligations remain 0.

## Evidence

- `tools/pslive-option-flatten-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/std/bootstrap-manifest.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `tools/k1d-foundation-tests.ts`
- `npm run test:pslive:option-flatten`
- `npm run test:p5:baseline`
- `npm run test:architecture`
- `npm run test:typescript-migration`
- `npm run test:conformance`
