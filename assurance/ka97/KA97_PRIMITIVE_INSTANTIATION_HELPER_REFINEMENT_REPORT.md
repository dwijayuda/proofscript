# KA-97 Primitive Instantiation Helper Refinement

Checkpoint: `proofscript-v1-ka97-primitive-instantiation-helper-refinement0`

Public version: `1.0.0-pskernel.100`

Baseline: `proofscript-v1-ka96-primitive-application-helper-refinement0`

KA-97 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive instantiation/telescope helper theorems. Total formal Lean4Lean bridge obligations: **306**.

## Counted obligations

- `translated_vexpr_liftN_lams_indexed_wf`
- `translated_list_mapIdx_replicate_nat_wf`
- `translated_vexpr_closedN_subst_eq_wf`
- `translated_onctx_nat_telescope_wf`
- `translated_ctx_liftN_nat_telescope_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
