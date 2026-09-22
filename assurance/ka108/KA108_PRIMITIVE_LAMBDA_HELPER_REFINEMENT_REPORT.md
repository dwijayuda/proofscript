# KA-108 Primitive Lambda Helper Refinement

Checkpoint: `proofscript-v1-ka108-primitive-lambda-helper-refinement0`

Public version: `1.0.0-pskernel.111`

Baseline: `proofscript-v1-ka107-primitive-telescope-shape-helper-refinement0`

KA-108 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive lambda helper theorems. Total formal Lean4Lean bridge obligations: **361**.

## Counted obligations

- `translated_vexpr_lams_appN_prime_wf`
- `translated_lambdaTelescope_wf`
- `translated_vexpr_wf_app_inv_prime_wf`
- `translated_vexpr_wf_lam_inv_prime_wf`
- `translated_vexpr_wf_betaU_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
