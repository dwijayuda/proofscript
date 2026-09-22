# KA-72 Kernel Feature Equivalence Progress

Checkpoint: `proofscript-v1-ka72-executable-defeq-eta-cache-status-refinement0`

Public version: `1.0.0-pskernel.75`

- Feature-surface bridge progress: **88%** audited conservative dashboard estimate
- Executable-kernel equivalence proof progress: **55%** audited conservative dashboard estimate
- Arena corpus regression evidence: **100%**
- Formal Lean4Lean bridge obligations: **220**

KA-72 adds four strict Lean4Lean DefEq eta/cache/status bridge obligations and deliberately excludes `tryEtaStructCore.WF` because its upstream theorem body still uses `sorry`.
