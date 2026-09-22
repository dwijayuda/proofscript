# Kernel Feature Equivalence Progress — KA-45

Checkpoint: `proofscript-v1-ka45-inductive-recursor-refinement-bridge0`

- Feature-surface bridge progress: **68%**
- Executable-kernel equivalence proof progress: **34%**
- Arena corpus regression evidence: **100% for completed direct gates**
- Formal Lean4Lean bridge obligations: **132**

These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.

| Feature group | Progress | Status |
|---|---:|---|
| ordinary-declarations | 82% | bridged proof-surface; executable refinement incomplete |
| quotients | 74% | environment bridge complete; semantic soundness incomplete |
| inductives | 44% | environment bridge plus recursor proof-surface bridge; generated rule/RHS refinement still open |
| mutual-definitions | 43% | initial environment bridge; executable refinement incomplete |
| expression-tags | 63% | TrExprS constructor surface covered; executable translator not fully refined |
| typechecker-whnf-defeq | 50% | WHNF/defeq proof-surface bridges exist; executable checker refinement incomplete |
| primitive-literals | 40% | Nat/Bool/literal proof-surface bridge only |
| codec-replay | 36% | Replay surface and PS codec stability gates exist |
| resource-errors | 39% | fuel/error conservativity surface bridge only |
| architecture-health | 80% | no-spaghetti ratchet plus KA45 semantic-package touch guard |
| end-to-end-refinement-spine | 30% | explicit staged checker refinement plan; no end-to-end theorem yet |
