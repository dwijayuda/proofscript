# Kernel Feature Equivalence Progress — KA-44

Checkpoint: `proofscript-v1-ka44-end-to-end-checker-refinement-plan0`

- Feature-surface bridge progress: **66%**
- Executable-kernel equivalence proof progress: **33%**
- Arena corpus regression evidence: **100% for completed direct gates**
- Formal Lean4Lean bridge obligations: **128**

These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.

| Feature group | Progress | Status |
|---|---:|---|
| ordinary-declarations | 82% | bridged proof-surface; executable refinement incomplete |
| quotients | 74% | environment bridge complete; semantic soundness incomplete |
| inductives | 36% | initial environment bridge; recursor/projection refinement still planned |
| mutual-definitions | 43% | initial environment bridge; executable refinement incomplete |
| expression-tags | 63% | TrExprS constructor surface covered; executable translator not fully refined |
| typechecker-whnf-defeq | 46% | proof-surface bridges exist; executable checker refinement incomplete |
| primitive-literals | 40% | Nat/Bool/literal proof-surface bridge only |
| codec-replay | 36% | Replay surface and PS codec stability gates exist |
| resource-errors | 39% | fuel/error conservativity surface bridge only |
| architecture-health | 76% | no-spaghetti ratchet plus module boundary plan |
| end-to-end-refinement-spine | 25% | explicit staged checker refinement plan; no end-to-end theorem yet |
