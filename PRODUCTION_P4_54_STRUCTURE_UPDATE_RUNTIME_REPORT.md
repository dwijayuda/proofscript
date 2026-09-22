# Production P4.54 — Structure Update Runtime Evidence

## Status

Accepted, trusted-boundary. This phase adds first-class PSC-1 evidence for structure update expressions that were already represented in the frontend as `structUpdate`, and binds them into standalone smoke, reference governance, examples, runtime feature metadata, and proof-obligation tracking.

This is not full Lean structure update support. It is a bounded PSC-1 slice for parameterless single-constructor source structures.

## Implemented slice

```proofscript
structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }
def pointMoved: Point := { {point with x := 3} }
def pointMovedX: Nat := { pointMoved.x }
def pointMovedY: Nat := { pointMoved.y }

theorem point_moved_x_eq_three: pointMovedX = 3 := by { rfl }
theorem point_moved_y_eq_two: pointMovedY = 2 := by { rfl }
```

## Semantics

- `{point with x := 3}` is parsed as a structure update.
- The elaborator infers the base type `Point`.
- The update lowers to `Point.mk 3 (Point.y point)`.
- The resulting Core is checked before JS emission.
- Runtime execution uses the existing frozen-record structure constructor/projection encoding.
- This is not JavaScript object mutation and not dynamic property access.

## Added/updated files

- `tools/structure-update-runtime-tests.ts`
- `package.json`
- `packages/runtime/src/index.ts`
- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`
- `examples/standalone-small/src/Main.ps`
- `packages/kernel/src/PSKernel/Verify/Obligations.ts`
- `PSKERNEL_TS_KERNEL_REWRITE_REPORT.md`

## New proof obligation

`ProofScript.Frontend.Structure.UpdateLowering`

The obligation is currently an informal trusted-boundary obligation, not a formal Lean proof.

## TDD evidence

RED:

```text
AssertionError: runtime feature manifest must explicitly list checked executable structure update
```

GREEN:

```text
STRUCTURE_UPDATE_RUNTIME=PASS
```

## Verification

See final release response for the exact fresh command results and hashes.

## Boundary

Supported:

- parameterless single-constructor structures
- simple source identifier update base
- explicit updated fields
- reconstruction of unchanged fields through generated checked projections
- rfl smoke for changed and preserved fields
- JS execution through checked constructor/projection lowering

Fail-closed / unsupported:

- parameterized structures
- dependent structure fields
- arbitrary expression update bases beyond the current parser slice
- nested update inference
- dynamic JS property update
- mutation semantics
- full Lean structure update elaboration
