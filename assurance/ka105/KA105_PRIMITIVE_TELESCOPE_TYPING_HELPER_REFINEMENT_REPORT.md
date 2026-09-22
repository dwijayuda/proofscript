# KA-104 Primitive Defeq Application Helper Refinement

Checkpoint: `proofscript-v1-ka105-primitive-defeq-application-helper-refinement0`

Public version: `1.0.0-pskernel.108`

Baseline: `proofscript-v1-ka104-primitive-telescope-typing-helper-refinement0`

KA-104 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive defeq/application helper theorems. Total formal Lean4Lean bridge obligations: **346**.

## Counted obligations

- `translated_isDefEqU_appN_prime_wf`
- `translated_trExprS_appN_wf`
- `translated_isDefEqU_app_arg_wf`
- `translated_vexpr_lams_ctx_wf`
- `translated_vexpr_lams_appN_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
