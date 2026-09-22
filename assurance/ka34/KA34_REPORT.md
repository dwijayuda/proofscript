# KA-34 Mutual Definition Environment Bridge Report

Checkpoint: `proofscript-v1-ka34-mutual-def-env-bridge0`

Public version: `1.0.0-pskernel.37`

Baseline: `proofscript-v1-ka33-inductive-env-bridge0`

## What changed

KA-34 adds a conditional direct Lean4Lean bridge for the mutual-definition feature group. It targets real Lean4Lean `VDecl.mutualDef`, `VDecl.WF.mutualDef`, `VEnv.WF`, `VEnv.Ordered`, `VEnv.addConsts`, and `VEnv.addDefEqs`.

## Machine-checked bridge lemmas

- `PSKernelKA34.translated_mutual_def_is_real_vdecl`
- `PSKernelKA34.translated_mutual_def_vdecl_wf`
- `PSKernelKA34.translated_mutual_def_env_wf`
- `PSKernelKA34.translated_mutual_def_env_ordered`
- `PSKernelKA34.translated_mutual_def_constants_member`
- `PSKernelKA34.translated_mutual_def_defeq_member`

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Mutual-definition semantic soundness: **no**
- Formal Lean4Lean bridge obligations: **66**

## Remaining mutual-definition gaps

- no executable PSKernel mutual-recursion checker refinement proof
- no termination/recursive-safety refinement proof for mutual definitions
- no frontend syntax or Core codec change for mutual definitions
- no WHNF/defeq refinement for mutually recursive unfolding
- no full Lean 4 equivalence
- same-theory claim remains false
