# KA-36 Expression Tag Coverage Bridge Report

Checkpoint: `proofscript-v1-ka36-expression-tag-coverage-bridge0`

Public version: `1.0.0-pskernel.39`

Baseline: `proofscript-v1-ka35-typechecker-refinement-bridge0`

## What changed

KA-36 adds a conditional direct Lean4Lean bridge for the full constructor surface of `Lean4Lean.TrExprS`: bvar, fvar, sort, const, app, lam, forallE, letE, lit, mdata, proj.

## Machine-checked bridge lemmas

- `PSKernelKA36.translated_bvar_expr_tag_covered`
- `PSKernelKA36.translated_fvar_expr_tag_covered`
- `PSKernelKA36.translated_sort_expr_tag_covered`
- `PSKernelKA36.translated_const_expr_tag_covered`
- `PSKernelKA36.translated_app_expr_tag_covered`
- `PSKernelKA36.translated_lam_expr_tag_covered`
- `PSKernelKA36.translated_forall_expr_tag_covered`
- `PSKernelKA36.translated_let_expr_tag_covered`
- `PSKernelKA36.translated_lit_expr_tag_covered`
- `PSKernelKA36.translated_mdata_expr_tag_covered`
- `PSKernelKA36.translated_proj_expr_tag_covered`

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Raw Lean.Expr metavariable coverage: **no**
- Formal Lean4Lean bridge obligations: **82**

## Remaining expression gaps

- raw Lean.Expr mvar executable policy remains unsupported/outside this bridge
- end-to-end executable PSKernel expression translator refinement remains unproven
- literal primitive semantic completeness remains separate from constructor-surface coverage
- projection semantic completeness remains separate from constructor-surface coverage
- full Lean4 equivalence remains unproven
