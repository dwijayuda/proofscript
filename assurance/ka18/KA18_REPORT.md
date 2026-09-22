# KA-18 Direct Lean4Lean VEnv No-Overwrite Bridge Report

## Checkpoint

- Checkpoint: `proofscript-v1-ka18-env-no-overwrite-bridge0`
- Baseline: `proofscript-v1-ka17-env-lookup-bridge0`
- Public version: `1.0.0-pskernel.21`
- Core artifact format: `71`
- Certificate format: `2`

## What changed

KA-18 adds a direct imported Lean4Lean bridge for environment no-overwrite/freshness facts. It imports `Lean4Lean.Theory.Typing.Env` and proves that successful `VEnv.addConst` implies the added name was fresh and preserves existing lookups at all other names. These facts are then lifted to translated PSKernel axiom and definition declarations.

## Machine-checked Lean bridge obligations added

- `PSKernelKA18.translated_axiom_fresh_before_add`
- `PSKernelKA18.translated_definition_fresh_before_add`
- `PSKernelKA18.translated_axiom_preserves_other_lookup`
- `PSKernelKA18.translated_definition_preserves_other_lookup`

Total conditional Lean4Lean bridge obligations: `13`.

## Boundary

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Core format changed: no, still `71`
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no

KA-18 remains conditional assurance over the imported Lean4Lean reference model. It does not prove that the executable TypeScript checker refines Lean4Lean.
