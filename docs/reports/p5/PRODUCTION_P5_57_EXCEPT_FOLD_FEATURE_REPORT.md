# Production P5.57 Except.fold Feature Report

## Scope

P5.57 adds `Except.fold(E, A, B, error, ok, value): B` as a PSC-1 checked-bootstrap helper. It also extracts telescope/type-constructor helper elaboration from `packages/elaborator/src/index.ts` into `packages/elaborator/src/telescopeElaboration.ts`.

## Semantics

- `Except.fold(E, A, B, error, ok, Except.error(E, A, e))` reduces to `error(e)`.
- `Except.fold(E, A, B, error, ok, Except.ok(E, A, x))` reduces to `ok(x)`.

The definition is checked through existing `Except.rec`; it does not add a kernel primitive or kernel reduction rule.

## Evidence

- Focused PSLive test: `tools/pslive-except-fold-tests.ts`.
- Checked bootstrap source: `packages/std/src/Bootstrap/Foundation.ps`.
- Checked bootstrap artifact: `packages/std/core/bootstrap.pscore.json`.
- Runtime/backend support: `packages/runtime/src/source.ts`, `packages/runtime/src/profile.ts`, `packages/backend-typescript/src/termEmitter.ts`.
- Foundation replay/reduction smoke: `tools/k1d-foundation-tests.ts`.

## Trust boundary

K3-TB trusted-boundary remains YES. Fully formal K3 remains NO. Full Lean 4 equivalence remains NO. Formal Lean 4 equivalence proven obligations remain 0.
