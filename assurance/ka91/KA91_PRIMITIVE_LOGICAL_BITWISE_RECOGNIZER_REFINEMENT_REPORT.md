# KA-91 Primitive Logical Bitwise Recognizer Refinement

Checkpoint: `proofscript-v1-ka91-primitive-logical-bitwise-recognizer-refinement0`

Public version: `1.0.0-pskernel.94`

Baseline: `proofscript-v1-ka90-primitive-shift-recognizer-refinement0`

KA-91 adds 3 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Nat logical-bitwise recognizer theorems. Total formal Lean4Lean bridge obligations: **281**.

## Counted obligations

- `translated_checkNatLAnd_wf`
- `translated_checkNatLOr_wf`
- `translated_checkNatXor_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Verification note

`TERM=xterm npm run verify:arena` timed out during the internal tutorial-harness step and was **not** counted as passed. The remaining Arena tail commands were rerun individually and passed.

Workspace packaging produced 36 tarballs and 36/36 package SHA-256 entries verified.
