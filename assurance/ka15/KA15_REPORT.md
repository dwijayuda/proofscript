# KA-15 VEnv.WF Bridge Report

Checkpoint: `proofscript-v1-ka15-env-wf-bridge0`

Public version: `1.0.0-pskernel.18`

Baseline: `proofscript-v1-ka14-real-arena-corpus0`

## Scope

KA-15 extends the KA-13 direct Lean4Lean bridge from single-declaration `VDecl.WF` facts to the real imported Lean4Lean environment well-formedness relation `VEnv.WF`.

It does not change trusted PSKernel semantics, the kernel codec, Core artifact format, certificate format, Arena behavior, or executable checker behavior.

## Direct Lean4Lean reference

KA-15 imports:

```lean
import Lean4Lean.Theory.Typing.Env
import PSKernelKA13VDeclWFBridge
```

The checked relation is:

```lean
Lean4Lean.VEnv.WF
```

## Machine-checked KA-15 obligations

- `PSKernelKA15.translated_axiom_env_wf`
- `PSKernelKA15.translated_definition_env_wf`

Together with KA-13, the counted formal bridge obligations are now 4.

## Claim boundary

- Full Lean 4 equivalence: **NO**
- Same theory as full Lean 4: **NO**
- Fully formal K3: **NO**
- Executable PSKernel refinement proof: **NO**
- Formal Lean4 equivalence proven obligations: **4**

The four obligations are conditional Lean4Lean bridge lemmas over the reference translation model. They are not a proof that the TypeScript PSKernel implementation refines Lean4Lean, and they are not a proof of full Lean 4 equivalence.
