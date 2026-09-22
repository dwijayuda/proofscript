# KA-83 Primitive Type Translation Refinement

Checkpoint: `proofscript-v1-ka83-primitive-type-translation-refinement0`

Public version: `1.0.0-pskernel.86`

Baseline: `proofscript-v1-ka82-primitive-dependency-reflection-refinement0`

KA-83 adds 6 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Nat/Bool type-translation and literal-closure theorems. Total formal Lean4Lean bridge obligations: **255**.

## Counted obligations

- `translated_natLitClosed_wf`
- `translated_natFstLamApp_wf`
- `translated_natIsType_wf`
- `translated_trNat_wf`
- `translated_boolIsType_wf`
- `translated_trBool_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Bounded release evidence

- Workspace package tarballs: **36**
- Package SHA-256 entries: **36/36 verified**
- Arena corpus preflight: **190 NDJSON fixtures**
- Arena static non-performance: **26/26 decisive**
- Arena tutorial: **140/140 decisive**
- `npm run verify:arena`: **timed out during internal tutorial; not counted as passed**
- Timed-out tail commands: **rerun individually and passed**
