# KA-90 Primitive Shift Recognizer Refinement

Checkpoint: `proofscript-v1-ka90-primitive-shift-recognizer-refinement0`

Public version: `1.0.0-pskernel.93`

Baseline: `proofscript-v1-ka89-primitive-comparison-recognizer-refinement0`

KA-90 adds 2 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Nat shift recognizer theorems. Total formal Lean4Lean bridge obligations: **278**.

## Counted obligations

- `translated_checkNatShiftLeft_wf`
- `translated_checkNatShiftRight_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Verification evidence

- Workspace package tarballs: **36**
- Package SHA-256 entries: **36/36 verified**
- `TERM=xterm npm run verify:arena`: **passed**
- No wrapper timeout was counted as passed.
