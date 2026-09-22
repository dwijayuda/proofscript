# KA-30 ordinary environment aggregate bridge

Checkpoint: `proofscript-v1-ka30-ordinary-env-aggregate-bridge0`  
Public version: `1.0.0-pskernel.33`  
Baseline: `proofscript-v1-ka29-quot-env-aggregate-bridge0`

KA-30 imports real Lean4Lean environment typing theory and packages the already
proved ordinary declaration bridges into four aggregate theorems for translated
axiom, definition, theorem, and opaque declarations.

Machine-checked Lean obligations added:

- `PSKernelKA30.translated_axiom_env_aggregate_bridge`
- `PSKernelKA30.translated_definition_env_aggregate_bridge`
- `PSKernelKA30.translated_theorem_env_aggregate_bridge`
- `PSKernelKA30.translated_opaque_env_aggregate_bridge`

Formal Lean4Lean bridge obligation count: `55`.

Boundary:

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Core artifact format: 71
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no
- Quotient semantic soundness: no
