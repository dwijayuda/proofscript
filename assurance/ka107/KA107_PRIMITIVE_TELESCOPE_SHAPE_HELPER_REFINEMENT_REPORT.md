# KA-107 Primitive Telescope Shape Helper Refinement

Checkpoint: `proofscript-v1-ka107-primitive-telescope-shape-helper-refinement0`

Public version: `1.0.0-pskernel.110`

Baseline: `proofscript-v1-ka106-primitive-extension-helper-refinement0`

KA-107 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive telescope-shape helper theorems. Total formal Lean4Lean bridge obligations: **356**.

## Counted obligations

- `translated_mlctx_dropN_toCtx_length_wf`
- `translated_mlctx_head_vlam_wf`
- `translated_mlctx_mkLambda_eq_lams_wf`
- `translated_expr_natBinderTypes_of_abstract1_wf`
- `translated_mlctx_mkLambda_natBinderTypes_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
