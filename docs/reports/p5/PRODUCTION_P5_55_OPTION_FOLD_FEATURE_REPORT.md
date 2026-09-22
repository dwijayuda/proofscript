# PRODUCTION P5.55 — Option.fold Feature and Elaborator Module Extraction Report

## Scope

P5.55 promotes `Option.fold(A, B, none, some, value): B` as a PSC-1 checked-bootstrap helper. The feature is implemented over existing checked `Option.rec`, so it does not introduce a new kernel primitive, kernel reduction rule, kernel refactor, or kernel restructuring.

## Semantics

- `Option.fold(A, B, none, some, Option.none(A))` reduces to `none`.
- `Option.fold(A, B, none, some, Option.some(A, x))` reduces to `some(x)`.

The focused PSLive test covers Nat and Bool return types, theorem/rfl reduction smoke, JS execution, TypeScript emission, and fail-closed negative cases for a wrong branch-function type and a non-Option value.

## Implementation

- Bootstrap source: `packages/std/src/Bootstrap/Foundation.ps`
- Checked Core artifact: `packages/std/core/bootstrap.pscore.json`
- Runtime helper: `packages/runtime/src/source.ts`
- TypeScript emitter mapping: `packages/backend-typescript/src/termEmitter.ts`
- Focused feature test: `tools/pslive-option-fold-tests.ts`
- Foundation replay/reduction test: `tools/k1d-foundation-tests.ts`

## Elaborator refactor

P5.55 continues reducing `packages/elaborator/src/index.ts` without changing public behavior or the kernel. The milestone moves primitive literal lowering into `packages/elaborator/src/primitiveSugarElaboration.ts` and extracts structure/class instance literal elaboration into `packages/elaborator/src/structureSugarElaboration.ts`, leaving `index.ts` as a smaller orchestration layer.

## Verification discipline

The feature was developed with a red/green focused test. The red phase failed with `unknown identifier: Option.fold`; the green phase passed after adding the checked bootstrap definition plus backend/runtime emission support.

## Trust boundary

P5.55 remains K3-TB trusted-boundary only. It is not fully formal K3, not full Lean 4 equivalence, and adds zero formal Lean 4 equivalence proofs. Formal Lean 4 equivalence proven obligations remain 0.
