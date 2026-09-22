# KA-62 Executable Expression Translator Uninstantiate Refinement Report

Checkpoint: `proofscript-v1-ka62-executable-expression-translator-uninstantiate-refinement0`

Public version: `1.0.0-pskernel.65`

Baseline: `proofscript-v1-ka61-executable-expression-translator-appstack-refinement0`

## What changed

KA-62 promotes Lean4Lean free-variable uninstantiation and tracked fvar instantiation facts into explicit ProofScript/PSKernel bridge wrappers. It covers TrExprS/TrExpr uninstantiateN, one-step TrExprS/TrExpr uninstantiate, and TrExprS inst_fvar. It still does not prove full executable expression translator refinement.

## Machine-checked bridge lemmas

- `translated_trExprS_uninstantiateN_wf`
- `translated_trExpr_uninstantiateN_wf`
- `translated_trExprS_uninstantiate_wf`
- `translated_trExpr_uninstantiate_wf`
- `translated_trExprS_inst_fvar_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-62 tool files: **2**
- New KA-62 oversized files: **0**
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
