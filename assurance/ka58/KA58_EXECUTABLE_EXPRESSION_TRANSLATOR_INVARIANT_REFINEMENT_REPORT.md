# KA-58 Executable Expression Translator Invariant Refinement Report

Checkpoint: `proofscript-v1-ka58-executable-expression-translator-invariant-refinement0`

Public version: `1.0.0-pskernel.61`

Baseline: `proofscript-v1-ka57-executable-expression-translator-source-transform-refinement0`

## What changed

KA-58 promotes Lean4Lean expression translation source invariant facts into explicit ProofScript/PSKernel bridge wrappers. It covers TrExprS closedness, TrExprS free-variable membership, TrExpr closedness, and TrExpr free-variable membership. It still does not prove full executable expression translator refinement.

## Machine-checked bridge lemmas

- `translated_trExprS_closed_wf`
- `translated_trExprS_fvarsIn_wf`
- `translated_trExpr_closed_wf`
- `translated_trExpr_fvarsIn_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-58 tool files: **2**
- New KA-58 oversized files: **0**
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

## Release verification note

The focused KA-58 gate and strict Lean4Lean bridge passed. The broad `verify:arena` wrapper timed out during its internal tutorial-harness stage and is recorded as **timed-out-not-counted**; the surrounding Arena commands and tail commands were run separately where needed. No wrapper timeout is counted as a pass.
