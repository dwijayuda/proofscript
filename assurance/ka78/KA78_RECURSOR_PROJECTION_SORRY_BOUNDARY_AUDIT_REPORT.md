# KA-78 Recursor/Projection Sorry-Boundary Audit Report

Checkpoint: `proofscript-v1-ka78-recursor-projection-sorry-boundary-audit0`

Public version: `1.0.0-pskernel.81`

Baseline: `proofscript-v1-ka77-executable-infer-structural-refinement0`

## Result

KA-78 adds **0** new proof obligations and applies a **-3** correction to the formal Lean4Lean bridge obligation ledger.

Corrected total formal Lean4Lean bridge obligations: **232**.

## Demoted direct-sorry-backed obligations

- `translated_reduceRecursor_wf` (Lean4Lean.TypeChecker.Inner.reduceRecursor.WF) — upstream_theorem_body_contains_sorry
- `translated_reduceProjCore_wf` (Lean4Lean.TypeChecker.Inner.reduceProjCore.WF) — upstream_theorem_body_contains_sorry
- `translated_inferProj_wf` (Lean4Lean.TypeChecker.Inner.inferProj.WF) — upstream_theorem_body_contains_sorry

## Flagged dependency risks

- `translated_whnfCore_recursor_path_wf` (Lean4Lean.TypeChecker.Inner.whnfCore'.WF) — calls_or_depends_on_reduceRecursor.WF
- `translated_whnf_recursor_path_wf` (Lean4Lean.TypeChecker.Inner.whnf.WF) — may_depend_on_reduceRecursor.WF_path
- `translated_reduceProj_wf` (Lean4Lean.TypeChecker.Inner.reduceProj.WF) — uses_reduceProjCore.WF_which_is_sorry_backed
- `translated_whnfCore_projection_path_wf` (Lean4Lean.TypeChecker.Inner.whnfCore'.WF) — projection_path_may_reach_reduceProjCore.WF
- `inferType'.WF` (Lean4Lean.TypeChecker.Inner.inferType'.WF) — uses_inferProj.WF_which_is_sorry_backed

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
