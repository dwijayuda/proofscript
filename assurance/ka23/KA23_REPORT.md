# KA-23 Nondef Environment Lookup Bridge Report

## Checkpoint

- Checkpoint: `proofscript-v1-ka23-nondef-env-lookup-bridge0`
- Public version: `1.0.0-pskernel.26`
- Baseline: `proofscript-v1-ka22-nondef-env-extension-bridge0`
- Core artifact format: `71`
- Certificate format: `2`
- Active kernel: `PSKernel`

## Scope

KA-23 adds a direct imported Lean4Lean lookup bridge for the remaining ordinary
non-inductive declaration kinds where environment lookup evidence applies:
translated `theorem` and `opaque` declarations. Translated `example`
declarations are recorded as non-adding because the KA-12 reference translation
checks them without extending the Lean4Lean environment.

## New machine-checked Lean obligations

- `PSKernelKA23.translated_theorem_env_lookup`
- `PSKernelKA23.translated_theorem_env_defeq_member`
- `PSKernelKA23.translated_opaque_env_lookup`

Total conditional Lean4Lean bridge obligations through KA-23: `28`.

## Claim boundary

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no

These are conditional Lean4Lean bridge lemmas only.
