# KA-67 Executable DefEq Binder/App/Eta Refinement Report

Checkpoint: `proofscript-v1-ka67-executable-defeq-binder-app-eta-refinement0`

Public version: `1.0.0-pskernel.70`

Baseline: `proofscript-v1-ka66-executable-defeq-core-refinement0`

## What changed

KA-67 continues from KA-66 and adds four strict Lean4Lean DefEq bridge wrappers for lambda binders, forall binders, application DefEq, and eta expansion. No trusted PSKernel semantics, codec, Core format, or certificate format are changed. Per user instruction, the old-codebase indexed-recursor regression is ignored for this continuation; KA-67 is verified through bounded KA/release gates rather than the repository-wide legacy suite.

## Machine-checked bridge lemmas

- `translated_isDefEqLambda_wf`
- `translated_isDefEqForall_wf`
- `translated_isDefEqApp_wf`
- `translated_tryEtaExpansion_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-67 tool files: **2**
- New KA-67 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable WHNF/DefEq refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
