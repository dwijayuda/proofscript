# KA-20 Non-definition VDecl.WF Bridge Report

Checkpoint: `proofscript-v1-ka20-nondef-vdecl-wf-bridge0`  
Public version: `1.0.0-pskernel.23`  
Baseline: `proofscript-v1-ka19-env-defeq-preservation-bridge0`  
Core artifact format: `71`  
Certificate format: `2`

## Purpose

KA-20 extends the direct imported Lean4Lean `VDecl.WF` bridge beyond the KA-13 axiom/definition slice to the remaining KA-12-supported ordinary non-inductive declaration kinds: theorem, example, and opaque.

## Machine-checked bridge obligations

- `PSKernelKA20.translated_theorem_vdecl_wf`
- `PSKernelKA20.translated_example_vdecl_wf`
- `PSKernelKA20.translated_opaque_vdecl_wf`

These are conditional Lean4Lean reference-model lemmas. They require Lean4Lean's own well-formedness and environment-addition premises where relevant.

## Boundary

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Core format changed: no, still 71
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no

Formal Lean4Lean bridge obligations after KA-20: `19`.
