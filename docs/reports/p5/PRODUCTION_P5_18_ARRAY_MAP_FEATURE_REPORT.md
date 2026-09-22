# Production P5.18 Array.map Feature Report

P5.18 adds explicit `Array.map(A, B, f, xs)` to the PSC-1 controlled-feature path. It is intentionally bounded: mapping reduces only for checked `Array.mk(A, finite List(A))` payloads and already-checked functions.

## Supported behavior

```ts
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def xs: Array(Nat) := { [1, 2, 3] }
def mappedInc: Array(Nat) := { Array.map(Nat, Nat, inc, xs) }
def mappedBool: Array(Bool) := { Array.map(Nat, Bool, isZero, [0, 1]) }

theorem mapped_inc_rfl: mappedInc = [2, 3, 4] := by rfl
theorem mapped_bool_rfl: mappedBool = [true, false] := by rfl
```

## Architecture

`Array.map` is a checked bootstrap declaration. The kernel validates the application type before primitive reduction, reads only checked finite `Array.mk`/`List` payloads, and rebuilds the result as checked `Array.mk(B, List...)` Core. Backend/runtime helpers execute only after Core checking.

## Non-claims

P5.18 is not full Lean Array semantics, not Functor/typeclass support, not `mapM`, not mutation/push/pop/fold, and not a formal Lean 4 equivalence proof. Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.

## Verification

Focused feature test: `tools/pslive-array-map-tests.ts`.
Controlled release gate: `tools/verify-p5-controlled-release.ts`.
Companion conformance: `node tools/conformance-runner.ts`.
