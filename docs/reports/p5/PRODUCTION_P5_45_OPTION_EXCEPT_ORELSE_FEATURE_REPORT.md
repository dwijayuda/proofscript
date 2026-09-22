# P5.45 Option.orElse / Except.orElse Feature Report

## Summary

P5.45 adds explicit PSC-1 fallback helpers:

```ps
Option.orElse(A, value, fallback): Option(A)
Except.orElse(E, A, value, fallback): Except(E, A)
```

Both helpers are checked bootstrap definitions over existing `Option.rec` / `Except.rec`; they are not new kernel primitives.

## Semantics

`Option.orElse` returns the original `Option.some` value when present and returns the fallback when the input is `Option.none`.

`Except.orElse` returns the original `Except.ok` value when present and returns the fallback when the input is `Except.error`.

## Trust boundary

- No kernel refactor.
- No kernel restructuring.
- No kernel source changes.
- No new kernel primitive reduction rule.
- Runtime helpers execute only after Core checking.
- K3-TB trusted-boundary remains unchanged.
- Formal Lean 4 equivalence proven obligations remain 0.

## Evidence

- `tools/pslive-option-except-orelse-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`
- `config/production-traceability-bundle.json`
- `config/development-workflow.json`
