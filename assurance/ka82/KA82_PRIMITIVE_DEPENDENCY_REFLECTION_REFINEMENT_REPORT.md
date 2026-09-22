# KA-82 Primitive Dependency Reflection Refinement

Checkpoint: `proofscript-v1-ka82-primitive-dependency-reflection-refinement0`

Public version: `1.0.0-pskernel.85`

Baseline: `proofscript-v1-ka81-primitive-reflection-typing-refinement0`

KA-82 adds 7 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive dependency-presence theorems. Total formal Lean4Lean bridge obligations: **249**.

## Counted obligations

- `translated_containsNatOfHasType_wf`
- `translated_natOfPred_wf`
- `translated_natOfAdd_wf`
- `translated_natOfMul_wf`
- `translated_natOfDiv_wf`
- `translated_natOfMod_wf`
- `translated_boolOfBitwise_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.


## Verification notes

Bounded release verification passed through focused KA-82 strict Lean4Lean checking, kernel smoke, standalone-small, PSC status/conformance, Arena corpus preflight, static Arena regression, full 140/140 Arena tutorial, aggregate `verify:arena`, and package SHA verification. No wrapper timeout was counted as passed.

Workspace packages: **36**. Package SHA-256 entries: **36/36 verified**.
