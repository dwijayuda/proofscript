# KA-81 Primitive Reflection Typing Refinement

Checkpoint: `proofscript-v1-ka81-primitive-reflection-typing-refinement0`

Public version: `1.0.0-pskernel.84`

Baseline: `proofscript-v1-ka80-infertype-top-level-projection-boundary-audit0`

KA-81 adds 5 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive reflection typing theorems. Total formal Lean4Lean bridge obligations: **242**.

## Counted obligations

- `translated_natZeroT_wf`
- `translated_natSuccT_wf`
- `translated_natPredT_wf`
- `translated_natLitT_wf`
- `translated_boolLitT_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.


## Verification notes

Bounded release verification passed through focused KA-81 strict Lean4Lean checking, kernel smoke, standalone-small, PSC status/conformance, Arena corpus preflight, static Arena regression, and package SHA verification.

`npm run test:arena:tutorial` timed out in this runtime and is recorded as timed-out-not-counted. The full legacy repository-wide `npm test` and aggregate `verify:arena` wrapper were not counted as passed.
