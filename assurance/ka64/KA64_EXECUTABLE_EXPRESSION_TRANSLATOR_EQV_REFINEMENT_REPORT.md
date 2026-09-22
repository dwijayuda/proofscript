# KA-64 Executable Expression Translator Eqv Refinement Report

Checkpoint: `proofscript-v1-ka64-executable-expression-translator-eqv-refinement0`

Public version: `1.0.0-pskernel.67`

Baseline: `proofscript-v1-ka63-executable-expression-translator-bool-literal-refinement0`

## What changed

KA-64 promotes Lean4Lean source-expression equivalence transport lemmas into explicit ProofScript/PSKernel bridge wrappers. It covers free-variable-list equality, FVarsIn transport, FVarsBelow transport, and TrTyping transport. It still does not prove full executable expression translator refinement.

## Machine-checked bridge lemmas

- `translated_fvarsList_eqv_wf`
- `translated_fvarsIn_eqv_wf`
- `translated_fvarsBelow_eqv_wf`
- `translated_trTyping_eqv_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-64 tool files: **2**
- New KA-64 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable expression translator refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
