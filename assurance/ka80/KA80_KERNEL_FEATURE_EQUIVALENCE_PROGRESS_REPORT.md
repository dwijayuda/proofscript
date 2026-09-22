# KA-80 Kernel Feature Equivalence Progress

Checkpoint: `proofscript-v1-ka80-infertype-top-level-projection-boundary-audit0`

Public version: `1.0.0-pskernel.83`

- Feature-surface bridge progress: **91%** conservative dashboard estimate
- Executable-kernel equivalence proof progress: **58%** conservative dashboard estimate
- Arena corpus regression evidence: **100%**
- Formal Lean4Lean bridge obligations: **237**

KA-80 adds no new proof obligations. It blocks top-level InferType/checkType counting until the InferType projection branch no longer routes through the KA78-demoted `inferProj.WF` boundary.
