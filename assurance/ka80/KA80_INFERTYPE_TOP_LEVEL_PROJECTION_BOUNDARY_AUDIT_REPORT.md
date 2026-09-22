# KA-80 InferType Top-Level Projection-Boundary Audit Report

Checkpoint: `proofscript-v1-ka80-infertype-top-level-projection-boundary-audit0`

Public version: `1.0.0-pskernel.83`

Baseline: `proofscript-v1-ka79-executable-infer-loop-refinement0`

## Result

KA-80 adds **0** new proof obligations and applies **0** ledger correction. Corrected total formal Lean4Lean bridge obligations remain **237**.

## Blocked top-level InferType obligations

- `translated_inferType_prime_wf` (Lean4Lean.TypeChecker.Inner.inferType'.WF) — theorem body contains a projection branch that calls inferProj.WF, which KA78 demoted as direct-sorry-backed
- `translated_inferType_wf` (Lean4Lean.TypeChecker.Inner.inferType.WF) — wrapper depends on the state-field/top-level inferType proof surface; do not count until inferType'.WF projection boundary is repaired
- `translated_checkType_wf` (Lean4Lean.TypeChecker.Inner.checkType.WF) — wrapper over inferType.WF'; do not count until the top-level InferType projection boundary is repaired

## Root blocked dependency

- `translated_inferProj_wf` (Lean4Lean.TypeChecker.Inner.inferProj.WF) — upstream_theorem_body_contains_sorry

## Still counted narrow Infer slices

- KA75 executable Infer atomic refinement
- KA76 executable Infer constant/literal refinement
- KA77 executable Infer structural refinement
- KA79 executable Infer loop refinement

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable InferType refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
