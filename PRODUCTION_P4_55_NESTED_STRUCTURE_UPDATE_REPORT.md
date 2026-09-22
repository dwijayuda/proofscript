# ProofScript Production P4.55 — Nested Structure Update Field Paths

Status: trusted-boundary standalone PSC-1 slice; not fully formally equivalent to Lean 4 yet.

## Scope

P4.55 adds bounded nested structure update syntax for parameterless single-constructor source structures:

```proofscript
structure Point: Type where {
  x: Nat;
  y: Nat;
}
structure Box: Type where {
  p: Point;
  label: Nat;
}
def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }
def boxMoved: Box := { {box with p.x := 7} }
def boxMovedX: Nat := { boxMoved.p.x }
def boxMovedY: Nat := { boxMoved.p.y }
def boxMovedLabel: Nat := { boxMoved.label }
theorem box_moved_x_eq_seven: boxMovedX = 7 := by { rfl }
theorem box_moved_y_eq_two: boxMovedY = 2 := by { rfl }
theorem box_moved_label_eq_nine: boxMovedLabel = 9 := by { rfl }
```

The accepted lowering is still kernel-first:

- infer the base structure type;
- split field paths by top-level structure field;
- reconstruct unchanged outer fields through generated projections;
- recursively reconstruct updated nested fields through generated projections and constructors;
- check the final Core term with the kernel before JS emission.

This is not JavaScript object mutation and not target-only property assignment.

## TDD evidence

RED:

```txt
check nested update {box with p.x := 7}
=> rejected: unknown structure update field 'p.x' for Box
```

GREEN:

```txt
STRUCTURE_NESTED_UPDATE=PASS
```

Focused positive cases:

- `{box with p.x := 7}` updates nested field `p.x`;
- `{box with p.x := 8, p.y := 6}` updates multiple nested fields under the same top-level field;
- unchanged nested sibling `p.y` is preserved;
- unchanged outer sibling `label` is preserved;
- rfl theorem smoke accepts the computed results.

Focused negative cases:

- `p.z` rejects for unknown nested field;
- mixing `p := ...` and `p.x := ...` in one update rejects fail-closed.

## Implementation notes

- Refactored `elab(structUpdate)` through `elaborateStructureUpdateCore(...)`.
- Added recursive nested field-path lowering in `packages/elaborator/src/index.ts`.
- Added `tools/structure-nested-update-tests.ts` and npm script `test:structure-nested-update`.
- Updated standalone smoke, reference governance, examples, runtime feature manifest, and proof-obligation catalog.
- Kept the kernel/release smoke fast by gating source-tree/source-archive/preflight release checks behind `PS_KERNEL_SMOKE_RELEASE=1`; those release checks remain available through their dedicated commands.

## Verification run

```bash
npm run build -- --pretty false
npm run test:structure-nested-update
npm run test:standalone-small
npm run test:reference-governance
npm run test:kernel:smoke
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-55.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call boxMovedX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call boxMovedY --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call boxMovedLabel --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call boxMovedBothX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call boxMovedBothY --json
```

Observed results:

```txt
build: PASS
structure-nested-update: PASS
standalone-small: PASS, checkedDeclarations=88
reference-governance: PASS, checks=59
kernel smoke: PASS
governance: PASS, checks=27, warnings=0, failures=0
example check: accepted, declarations=90
example build-js: accepted
boxMovedX: 7
boxMovedY: 2
boxMovedLabel: 9
boxMovedBothX: 8
boxMovedBothY: 6
```

## Boundary

This is not full Lean structure update support. P4.55 supports bounded field paths over parameterless single-constructor source structures. Parameterized/dependent structures, arbitrary update bases beyond the current parser slice, dynamic JavaScript properties, and full record-update elaboration remain outside the trusted subset and must fail closed.
