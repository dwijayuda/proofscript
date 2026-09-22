# KA-35 TypeChecker Refinement Bridge Report

Checkpoint: `proofscript-v1-ka35-typechecker-refinement-bridge0`

Public version: `1.0.0-pskernel.38`

Baseline: `proofscript-v1-ka34-mutual-def-env-bridge0`

## What changed

KA-35 adds a conditional direct Lean4Lean bridge for the executable TypeChecker proof surface. It targets real Lean4Lean `TypeChecker.whnf.WF`, `whnfCore.WF`, `inferType.WF`, `checkType.WF`, and `isDefEq.WF`.

## Machine-checked bridge lemmas

- `PSKernelKA35.translated_whnf_refines_typing`
- `PSKernelKA35.translated_whnfCore_refines_typing`
- `PSKernelKA35.translated_inferType_refines_typing`
- `PSKernelKA35.translated_checkType_refines_typing`
- `PSKernelKA35.translated_isDefEq_refines_defeq`

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- TypeChecker semantic completeness: **no**
- Formal Lean4Lean bridge obligations: **71**

## Remaining TypeChecker gaps

- executable PSKernel checker refinement to Lean4Lean TypeChecker.M.run is not proven
- PSKernel expression codec/replay correctness is not tied to Lean4Lean TrExpr for all tags
- WHNF and definitional equality algorithm parity are not proven end-to-end
- recursor, projection, quotient, and primitive reduction completeness remain partial
- resource/error conservativity for executable PSKernel checker is not proven
- full Lean 4 equivalence and same-theory claims remain false
