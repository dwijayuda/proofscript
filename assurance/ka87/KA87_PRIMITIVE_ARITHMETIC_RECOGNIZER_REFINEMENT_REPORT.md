# KA-87 Primitive Arithmetic Recognizer Refinement

Checkpoint: `proofscript-v1-ka87-primitive-arithmetic-recognizer-refinement0`

Public version: `1.0.0-pskernel.90`

Baseline: `proofscript-v1-ka86-primitive-divmod-recognizer-refinement0`

KA-87 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Nat.add/Nat.pred/Nat.sub/Nat.mul/Nat.pow recognizer theorems. Total formal Lean4Lean bridge obligations: **272**.

## Counted obligations

- `translated_checkNatAdd_wf`
- `translated_checkNatPred_wf`
- `translated_checkNatSub_wf`
- `translated_checkNatMul_wf`
- `translated_checkNatPow_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Verification evidence

- TDD red test: failed as expected on missing KA-87 gate.
- Strict Lean4Lean gate: passed.
- Build/smoke/standalone/PSC conformance: passed.
- Arena corpus/static/tutorial/verify wrapper: passed.
- Workspace package tarballs: **36**.
- Package SHA-256 entries: **36/36 verified**.
