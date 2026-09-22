# KA-84 Primitive Condition Reflection Refinement

Checkpoint: `proofscript-v1-ka84-primitive-condition-reflection-refinement0`

Public version: `1.0.0-pskernel.87`

Baseline: `proofscript-v1-ka83-primitive-type-translation-refinement0`

KA-84 adds 8 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive condition/reflection type-translation and literal-computation theorems. Total formal Lean4Lean bridge obligations: **263**.

## Counted obligations

- `translated_boolProp_wf`
- `translated_propBoolProp_wf`
- `translated_boolNat3_wf`
- `translated_natNatProp_wf`
- `translated_natLE_apply_wf`
- `translated_natEq_apply_wf`
- `translated_natLE_apply_zero_wf`
- `translated_natEq_apply_zero_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Bounded release evidence

- Workspace package tarballs: **36**
- Package SHA-256 entries: **36/36 verified**
- Arena corpus preflight: **190 NDJSON fixtures**
- Arena static non-performance: **26/26 decisive**
- Arena tutorial: **140/140 decisive**
- `npm run verify:arena`: **passed**

- Fresh extract install/build/test:pskernel:ka84/lean:ka84:check: **passed**
