# KA-31 Example Environment Aggregate Bridge

Checkpoint: `proofscript-v1-ka31-example-env-aggregate-bridge0`  
Public version: `1.0.0-pskernel.34`  
Baseline: `proofscript-v1-ka30-ordinary-env-aggregate-bridge0`

KA-31 adds one direct Lean4Lean theorem for translated ProofScript examples.
It aggregates the already-proven KA-20..KA-22 facts for examples over real
Lean4Lean `VDecl.WF`, `VEnv.WF`, and reflexive `VEnv.LE`.

New machine-checked theorem obligation:

- `PSKernelKA31.translated_example_env_aggregate_bridge`

Examples remain deliberately non-adding. KA-31 therefore does not claim constant
lookup insertion, no-overwrite, or definitional-equation insertion for examples.

Boundary:

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Core artifact format: 71
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Quotient semantic soundness: no
- Formal Lean4 bridge obligations: 56
