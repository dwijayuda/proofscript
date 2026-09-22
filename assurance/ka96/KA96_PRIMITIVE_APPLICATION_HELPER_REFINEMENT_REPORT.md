# KA-96 Primitive Application Helper Refinement

Checkpoint: `proofscript-v1-ka96-primitive-application-helper-refinement0`

Public version: `1.0.0-pskernel.99`

Baseline: `proofscript-v1-ka95-primitive-typeeq-helper-refinement0`

KA-96 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive application/telescope helper theorems. Total formal Lean4Lean bridge obligations: **301**.

## Counted obligations

- `translated_vexpr_insts_appN_wf`
- `translated_vexpr_subst_appN_wf`
- `translated_vexpr_lams_append_wf`
- `translated_expr_appN_eq_mkAppList_wf`
- `translated_expr_mkAppN_eq_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
