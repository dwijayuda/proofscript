# Production P5.49 — Except.mapError Feature Report

## Summary

P5.49 adds one checked-bootstrap PSC-1 helper:

```ps
Except.mapError(E, F, A, f, value): Except(F, A)
```

The implementation adds no kernel refactor, no kernel restructuring, and no kernel source change.

## Semantics

`Except.mapError` is a checked bootstrap definition over the existing checked `Except.rec` recursor:

```ps
def Except.mapError(E: Type, F: Type, A: Type, f: E -> F, value: Except(E, A)): Except(F, A) := {
  Except.rec.{1}(
    E,
    A,
    fun (x: Except(E, A)) => Except(F, A),
    fun (error: E) => Except.error(F, A, f(error)),
    fun (inner: A) => Except.ok(F, A, inner),
    value
  )
}
```

Observable behavior:

```text
Except.error(E, A, e) -> Except.error(F, A, f(e))
Except.ok(E, A, x) -> Except.ok(F, A, x)
```

## Verification

Focused test command:

```bash
node tools/pslive-except-maperror-tests.ts
```

The focused smoke covers:

- JS emission and execution.
- TypeScript emission, compilation, and execution.
- `by rfl` theorem/reduction checks.
- Negative fail-closed checks for wrong mapper type and wrong input container.

## Trust boundary

P5.49 remains K3-TB trusted-boundary evidence only. It does not prove full Lean 4 equivalence, does not complete fully formal K3, and does not claim full Lean `Except` library/typeclass equivalence.
