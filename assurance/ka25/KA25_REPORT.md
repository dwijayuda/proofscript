# KA-25 Non-Definition Environment DefEq Preservation Bridge

Checkpoint: `proofscript-v1-ka25-nondef-env-defeq-preservation-bridge0`

Public version: `1.0.0-pskernel.28`

Baseline: `proofscript-v1-ka24-nondef-env-no-overwrite-bridge0`

## What changed

KA-25 adds a direct Lean4Lean bridge for non-definition declaration kinds that
interact with Lean4Lean's real `VEnv.defeqs` relation:

- translated theorem additions preserve existing `VEnv.defeqs` facts;
- translated theorem additions also insert the theorem's own `VDefEq`;
- translated opaque additions preserve existing `VEnv.defeqs` facts.

Translated examples remain non-adding and are not assigned fake environment
insertion facts.

## Proven bridge obligations

- `PSKernelKA25.translated_theorem_preserves_existing_defeq`
- `PSKernelKA25.translated_theorem_preserves_existing_and_adds_new_defeq`
- `PSKernelKA25.translated_opaque_preserves_existing_defeq`

Total formal Lean4Lean bridge obligations: 35.

## Boundary

No trusted PSKernel semantic change. No kernel codec change. No new trusted
computation rule. No full Lean 4 equivalence claim. No same-theory claim. No
fully formal K3 claim.
