# KA-37 WHNF Head-Reduction Bridge Report

Checkpoint: `proofscript-v1-ka37-whnf-head-reduction-bridge0`

Public version: `1.0.0-pskernel.40`

Baseline: `proofscript-v1-ka36-expression-tag-coverage-bridge0`

## What changed

KA-37 adds a conditional direct Lean4Lean bridge for a theory-level WHNF/head-reduction surface: WHNF.bvar, WHNF.lam, WHNF.sort, WHNF.forallE, WHRed.beta, WHRed.app, WHRedS.app, WHRedS.determ.

## Machine-checked bridge lemmas

- `PSKernelKA37.translated_whnf_bvar_head_normal`
- `PSKernelKA37.translated_whnf_lam_head_normal`
- `PSKernelKA37.translated_whnf_sort_head_normal`
- `PSKernelKA37.translated_whnf_forall_head_normal`
- `PSKernelKA37.translated_whred_beta_step`
- `PSKernelKA37.translated_whred_app_congruence`
- `PSKernelKA37.translated_whreds_app_congruence`
- `PSKernelKA37.translated_whreds_deterministic`

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full WHNF/recursor refinement: **no**
- Formal Lean4Lean bridge obligations: **90**

## Remaining WHNF/reduction gaps

- end-to-end executable PSKernel WHNF refinement is not proven
- recursor reduction/iota refinement is not proven
- projection reduction refinement is not proven
- quotient reduction refinement is not proven
- WHNF cache/refinement relation to PSKernel runtime data structures is not proven
- full Lean4 equivalence remains unproven
