# KA-68 Executable DefEq Proof/Level/Offset Refinement Report

Checkpoint: `proofscript-v1-ka68-executable-defeq-proof-level-offset-refinement0`

Public version: `1.0.0-pskernel.71`

Baseline: `proofscript-v1-ka67-executable-defeq-binder-app-eta-refinement0`

## What changed

KA-68 continues from KA-67 and adds four strict Lean4Lean DefEq bridge wrappers for sort-level extraction, proposition recognition, proof-irrelevance DefEq, and Nat-offset DefEq. No trusted PSKernel semantics, codec, Core format, or certificate format are changed. Per user instruction, the old-codebase indexed-recursor regression is ignored for this continuation.

## Machine-checked bridge lemmas

- `translated_getSortLevel_wf`
- `translated_isProp_wf`
- `translated_isDefEqProofIrrel_wf`
- `translated_isDefEqOffset_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-68 tool files: **2**
- New KA-68 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable WHNF/DefEq refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**

## Final package

Final ZIP SHA-256: `d305e40e28b9a6583774bea40a2221ab0b4db246871c7ee2269739a3db6efcbc`

Final ZIP integrity: `unzip -t` passed and `sha256sum -c` passed.
