# KA-38 WHNF Preservation Bridge Report

Checkpoint: `proofscript-v1-ka38-whnf-preservation-bridge0`

Public version: `1.0.0-pskernel.41`

Baseline: `proofscript-v1-ka37-whnf-head-reduction-bridge0`

## What changed

KA-38 adds a conditional direct Lean4Lean bridge for WHNF preservation facts: WHRed.determ, WHRed.defeq, WHRed.hasType, WHRedS.defeq, WHRedS.hasType, WHNF.whRedS.

## Machine-checked bridge lemmas

- `PSKernelKA38.translated_whred_single_step_deterministic`
- `PSKernelKA38.translated_whred_defeq_preservation`
- `PSKernelKA38.translated_whred_type_preservation`
- `PSKernelKA38.translated_whreds_defeq_preservation`
- `PSKernelKA38.translated_whreds_type_preservation`
- `PSKernelKA38.translated_whnf_whreds_fixed_point`

## Kernel feature equivalence progress

- Feature-surface bridge progress: **54%**
- Executable-kernel equivalence proof progress: **24%**
- Formal Lean4Lean bridge obligations: **96**

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full WHNF/recursor refinement: **no**
- Formal Lean4Lean bridge obligations: **96**

## Remaining WHNF/reduction gaps

- end-to-end executable PSKernel WHNF refinement against Lean4Lean TypeChecker.whnf
- recursor/iota/projection/structure reduction refinement
- quotient computation semantic soundness
- definitional equality algorithm completeness/refinement
- full Lean4 equivalence remains unproven
