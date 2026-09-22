# Production P5.48 — Option.toExcept / Except.toArray Feature Report

## Summary

P5.48 adds two checked-bootstrap PSC-1 conversion helpers:

```ps
Option.toExcept(E, A, value, error): Except(E, A)
Except.toArray(E, A, value): Array(A)
```

The implementation adds no kernel refactor, no kernel restructuring, and no kernel source change.

## Semantics

`Option.toExcept` is a checked bootstrap definition over the existing checked `Option.rec` recursor:

```ps
def Option.toExcept(E: Type, A: Type, value: Option(A), error: E): Except(E, A) := {
  Option.rec.{1}(
    A,
    fun (x: Option(A)) => Except(E, A),
    Except.error(E, A, error),
    fun (inner: A) => Except.ok(E, A, inner),
    value
  )
}
```

`Except.toArray` is a checked bootstrap definition over the existing checked `Except.toOption` and `Option.toArray` helpers:

```ps
def Except.toArray(E: Type, A: Type, value: Except(E, A)): Array(A) := {
  Option.toArray(A, Except.toOption(E, A, value))
}
```

Observable behavior:

```text
Option.some(A, x) -> Except.ok(E, A, x)
Option.none(A) -> Except.error(E, A, error)
Except.ok(E, A, x) -> Array.singleton(A, x)
Except.error(E, A, e) -> Array.mk(A, List.nil(A))
```

## Verification

Focused test command:

```bash
node tools/pslive-option-except-toexcept-toarray-tests.ts
```

The focused smoke covers:

- JS emission and execution.
- TypeScript emission, compilation, and execution.
- `by rfl` theorem/reduction checks.
- Negative fail-closed checks for wrong input and wrong fallback/error type.

## Trust boundary

P5.48 remains K3-TB trusted-boundary evidence only. It does not prove full Lean 4 equivalence, does not complete fully formal K3, and does not claim full Lean Option/Except/Array library equivalence.
