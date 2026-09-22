# ProofScript P4.53 — Structure Dotted Projection Sugar

Status: PASS

Trust label: trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet.

## Goal

Add the next small ergonomic PSC-1 structure slice after P4.52 structure runtime support: dotted field projection syntax such as `point.x`, while keeping semantics bound to generated checked structure projections (`Point.x(point)`) instead of JavaScript-only property access.

## RED

Before implementation, this source rejected:

```proofscript
structure Point: Type where {
  x: Nat;
  y: Nat;
}

def point: Point := { {x := 1, y := 2} }
def pointDotX: Nat := { point.x }
def pointDotY: Nat := { point.y }

theorem point_dot_x_eq_one: pointDotX = 1 := by { rfl }
theorem point_dot_y_eq_two: pointDotY = 2 := by { rfl }
```

Observed diagnostic:

```txt
unknown identifier: point.x
```

## GREEN

Implemented `tryElabDottedStructureProjection(...)` in `packages/elaborator/src/index.ts`.

The new behavior is deliberately a frontend desugaring:

```txt
point.x  ==>  Point.x(point)
point.y  ==>  Point.y(point)
```

The elaborator:

1. first gives ordinary global/namespace names priority;
2. only tries dotted projection when ordinary resolution fails;
3. elaborates and infers the base term;
4. requires the inferred base type to be a known source structure with no parameters in PSC-1;
5. resolves the field against generated structure metadata;
6. emits a checked Core application of the generated projection constant;
7. asks the kernel to infer the generated Core term before accepting it.

No JavaScript property access semantics are introduced.

## Added coverage

- `tools/structure-dot-projection-tests.ts`
- `npm run test:structure-dot-projection`
- `examples/standalone-small/src/Main.ps`
- `tools/pslive-smoke-lib.ts`
- `tools/reference-language-governance-smoke.ts`
- `packages/runtime/src/index.ts` supported-feature ledger
- `packages/kernel/src/PSKernel/Verify/Obligations.ts`

New proof obligation:

```txt
ProofScript.Frontend.Structure.DottedProjectionSugar
```

## Positive examples

```proofscript
def pointDotX: Nat := { point.x }
def pointDotY: Nat := { point.y }

theorem point_dot_x_eq_one: pointDotX = 1 := by { rfl }
theorem point_dot_y_eq_two: pointDotY = 2 := by { rfl }
```

Runtime results:

```txt
pointDotX = 1
pointDotY = 2
```

## Negative/fail-closed examples

Unknown field rejects:

```proofscript
structure DotPoint: Type where {
  x: Nat;
}

def dot_point: DotPoint := { {x := 1} }
def bad_dot_field: Nat := { dot_point.y }
```

Dotted access on non-structure base rejects:

```proofscript
def dot_nat_base: Nat := { 1 }
def bad_dot_base: Nat := { dot_nat_base.x }
```

## Verification

Fresh verification performed in the P4.53 workspace:

```bash
npm run build -- --pretty false
npm run test:structure-dot-projection
npm run test:standalone-small
npm run test:reference-governance
node tools/pskernel-kernel-smoke.ts
npm run test:governance
node tools/pslive.ts check examples/standalone-small/src/Main.ps --json
node tools/pslive.ts build-js examples/standalone-small/src/Main.ps --out artifacts/standalone-small-main-p4-53.js --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call pointDotX --json
node tools/pslive.ts run examples/standalone-small/src/Main.ps --call pointDotY --json
```

Observed results:

```txt
build: PASS
structure-dot-projection: PASS
standalone-small: PASS, checkedDeclarations=67
reference-governance: PASS, checks=49
kernel smoke direct node command: PASS
governance: PASS, checks=27, warnings=0, failures=0
example check: accepted, declarations=69
example build-js: accepted
pointDotX: 1
pointDotY: 2
```

Note: `npm run test:kernel:smoke` timed out in the sandbox wrapper once, but the direct command `node tools/pskernel-kernel-smoke.ts` completed with `PSKERNEL_TS_KERNEL_SMOKE=PASS`. The npm-wrapper timeout is not counted as a clean npm pass; the direct kernel smoke pass is counted.

## Current progress estimate

```txt
Standalone PSC-1 without Lean4: ~94.6%
PSC-1 small complete programming language: ~63.7%
PSC-1 small theorem prover: ~60.0%
Full ProofScript compiler: ~55.8%
Full Lean-like ProofScript without Lean4: ~11.8%
Formal Lean 4 equivalence: 0 proven obligations
```

## Boundary

This is not full Lean structure support. It is a bounded PSC-1 sugar layer for parameterless source structures whose generated projections are already present in the checked Core environment. Parameterized structures, dependent projections, general namespace disambiguation, arbitrary nested structures, and JavaScript-style dynamic property access remain unsupported/fail-closed.
