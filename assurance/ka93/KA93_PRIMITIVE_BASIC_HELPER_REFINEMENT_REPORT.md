# KA-93 Primitive Basic Helper Refinement

Checkpoint: `proofscript-v1-ka93-primitive-basic-helper-refinement0`

Public version: `1.0.0-pskernel.96`

Baseline: `proofscript-v1-ka92-primitive-char-string-recognizer-refinement0`

KA-93 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive helper theorems: primitive-name presence, Nat binary literal computation, Bool-valued Nat binary literal computation, Nat probe introduction, and Bool probe introduction. Total formal Lean4Lean bridge obligations: **288**.

## Counted obligations

- `translated_contains_primitive_wf`
- `translated_natBinLit_wf`
- `translated_natBinLitBool_wf`
- `translated_withNatProbe_wf`
- `translated_withBoolProbe_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Verification evidence

- `TERM=xterm npm run verify:arena`: timed out during final tail command; not counted as passed.
- Timed-out tail command rerun individually: `npm run test:arena:mutual-imax-prop-reject` passed.
- Workspace packages: 36 tarballs; 36/36 SHA-256 entries verified.
