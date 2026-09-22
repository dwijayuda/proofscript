# KA-78 Kernel Feature Equivalence Progress

Checkpoint: `proofscript-v1-ka78-recursor-projection-sorry-boundary-audit0`

Public version: `1.0.0-pskernel.81`

- Feature-surface bridge progress: **90%** conservative dashboard estimate
- Executable-kernel equivalence proof progress: **57%** conservative dashboard estimate
- Arena corpus regression evidence: **100%**
- Corrected formal Lean4Lean bridge obligations: **232**

KA-78 adds no new proof obligations. It corrects the obligation ledger by demoting three direct upstream-sorry-backed recursor/projection obligations and flags projection/recursor dependency risks for a later transitive audit.
