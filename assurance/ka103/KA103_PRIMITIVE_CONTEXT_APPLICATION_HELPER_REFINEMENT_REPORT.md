# KA-103 Primitive Context/Application Helper Refinement

Checkpoint: `proofscript-v1-ka103-primitive-context-application-helper-refinement0`

Public version: `1.0.0-pskernel.106`

Baseline: `proofscript-v1-ka102-primitive-substitution-composition-helper-refinement0`

KA-103 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive context/application helper theorems. Total formal Lean4Lean bridge obligations: **336**.

## Counted obligations

- `translated_onctx_of_append_wf`
- `translated_vexpr_wf_app_inv2_wf`
- `translated_vexpr_wf_appN_inv_wf`
- `translated_isDefEqU_appN_wf`
- `translated_argsTyped_natTelescope_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
