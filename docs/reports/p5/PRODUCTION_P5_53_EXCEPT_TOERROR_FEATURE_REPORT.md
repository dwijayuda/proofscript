# Production P5.53 — Except.toError Feature Report

P5.53 adds explicit `Except.toError(E, A, value): Option(E)` as a checked-bootstrap PSC-1 helper.

## Semantics

```text
Except.toError(E, A, Except.error(E, A, e)) = Option.some(E, e)
Except.toError(E, A, Except.ok(E, A, x))    = Option.none(E)
```

## Implementation

`Except.toError` is implemented in `packages/std/src/Bootstrap/Foundation.ps` using the existing checked `Except.rec` and `Option` constructors. It is not a new kernel primitive and it does not require kernel refactor or restructuring.

The executable backend maps checked Core calls to `__ps.Except_toError` only after frontend/Core checking. Runtime support validates the PSC-1 tagged `Except` payload shape before returning a PSC-1 tagged `Option` value.

## Tests

- `tools/pslive-except-toerror-tests.ts` verifies JS execution, TypeScript emission/compile, theorem/rfl behavior, and negative type mismatch rejection.
- `tools/k1d-foundation-tests.ts` verifies that the checked bootstrap includes and reduces `Except.toError`.
- Architecture, feature-promotion, verification-matrix, traceability, baseline, TypeScript migration, conformance, and smoke tests remain required release evidence.

## Trust caveat

This is checked-bootstrap PSC-1 support. It is not a formal Lean 4 equivalence proof, not fully formal K3, and not a new kernel theorem. Formal Lean 4 equivalence proven obligations remain 0.
