# KA-101 Primitive Substitution Helper Refinement

Checkpoint: `proofscript-v1-ka101-primitive-substitution-helper-refinement0`

Public version: `1.0.0-pskernel.104`

Baseline: `proofscript-v1-ka100-primitive-sequence-helper-refinement0`

KA-101 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive substitution/free-variable helper theorems. Total formal Lean4Lean bridge obligations: **326**.

## Counted obligations

- `translated_forall2_rev_wf`
- `translated_trExpr_fvar_uniq_wf`
- `translated_forall2_fvars_uniq_wf`
- `translated_subst_consN_add_wf`
- `translated_liftN_subst_consN_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.
