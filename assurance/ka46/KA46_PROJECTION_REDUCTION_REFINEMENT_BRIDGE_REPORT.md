# KA-46 Projection Reduction Refinement Bridge Preflight Report

Checkpoint: `proofscript-v1-ka46-projection-reduction-refinement-preflight0`

Public version: `1.0.0-pskernel.49`

Baseline: `proofscript-v1-ka45-inductive-recursor-refinement-bridge0`

## What changed

KA-46 adds a narrow source-bound Lean4Lean projection-reduction bridge scaffold and strict anti-spaghetti gate. It does not modify trusted PSKernel semantic packages, the kernel codec, Core format, or certificate format.

## Intended Lean4Lean bridge lemmas

- `Lean4Lean.PSKernelKA46.translated_reduceProjCore_wf`
- `Lean4Lean.PSKernelKA46.translated_reduceProj_wf`
- `Lean4Lean.PSKernelKA46.translated_whnfCore_projection_path_wf`
- `Lean4Lean.PSKernelKA46.translated_inferProj_wf`

## Formal Lean status

- Status: **blocked**
- Blocked reasons: external_dependency_fetch_failed_or_dependency_unavailable

No new formal bridge obligation is counted in KA-46 preflight.

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-46 tool files: **2**
- New KA-46 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Executable PSKernel refinement proof: **no**
- Full projection reduction refinement: **no**
- Formal Lean4Lean bridge obligations: **132**
