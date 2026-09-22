# KA-47 Executable Expression Translator Refinement Preflight Report

Checkpoint: `proofscript-v1-ka47-executable-expression-translator-refinement-preflight0`

Public version: `1.0.0-pskernel.50`

Baseline: `proofscript-v1-ka46-projection-reduction-refinement-preflight0`

## What changed

KA-47 adds a narrow source-bound Lean4Lean executable-expression-translator refinement scaffold and strict anti-spaghetti gate. It does not modify trusted PSKernel semantic packages, the kernel codec, Core format, or certificate format.

## Intended Lean4Lean bridge lemmas

- `Lean4Lean.PSKernelKA47.translated_vexpr_constructor_surface_available`
- `Lean4Lean.PSKernelKA47.translated_trExprS_constructor_surface_available`
- `Lean4Lean.PSKernelKA47.translated_mvar_exclusion_surface_available`
- `Lean4Lean.PSKernelKA47.translated_vexpr_substitution_surface_available`

## Formal Lean status

- Status: **blocked**
- Blocked reasons: external_dependency_fetch_failed_or_dependency_unavailable

No new formal bridge obligation is counted in KA-47 preflight.

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-47 tool files: **2**
- New KA-47 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Executable PSKernel refinement proof: **no**
- Full executable expression translator refinement: **no**
- Formal Lean4Lean bridge obligations: **132**
