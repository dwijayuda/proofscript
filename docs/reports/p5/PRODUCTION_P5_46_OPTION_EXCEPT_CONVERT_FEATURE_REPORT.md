# P5.46 Option.toList / Except.toOption Feature Report

## Summary

P5.46 adds explicit PSC-1 conversion helpers:

```ps
Option.toList(A, value): List(A)
Except.toOption(E, A, value): Option(A)
```

Both helpers are checked bootstrap definitions over existing `Option.rec` / `Except.rec`; they are not new kernel primitives.

## Semantics

`Option.toList` returns a singleton list for `Option.some` and an empty list for `Option.none`.

`Except.toOption` returns `Option.some` for `Except.ok` and `Option.none` for `Except.error`.

## Trust boundary

- No kernel refactor.
- No kernel restructuring.
- No kernel source changes.
- No new kernel primitive reduction rule.
- Runtime helpers execute only after Core checking.
- K3-TB trusted-boundary remains unchanged.
- Formal Lean 4 equivalence proven obligations remain 0.

## Evidence

- `tools/pslive-option-except-convert-tests.ts`
- `tools/k1d-foundation-tests.ts`
- `packages/std/src/Bootstrap/Foundation.ps`
- `packages/std/core/bootstrap.pscore.json`
- `packages/backend-typescript/src/termEmitter.ts`
- `packages/runtime/src/source.ts`
- `config/feature-promotion-gate.json`
- `config/verification-matrix.json`
- `config/production-traceability-bundle.json`
- `config/development-workflow.json`
