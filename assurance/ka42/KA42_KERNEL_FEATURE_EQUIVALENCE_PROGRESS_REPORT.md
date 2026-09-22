# Kernel Feature Equivalence Progress — KA-42

Checkpoint: `proofscript-v1-ka42-resource-error-conservativity-bridge0`

- Feature-surface bridge progress: **63%**
- Executable-kernel equivalence proof progress: **30%**
- Arena corpus regression evidence: **100% for completed direct gates**
- Formal Lean4Lean bridge obligations: **128**

These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.

| Feature group | Progress | Status |
|---|---:|---|
| ordinary-declarations | 82% | aggregate bridges present; executable refinement still open |
| quotients | 68% | environment bridges present; semantic quotient soundness still open |
| inductives | 33% | conditional environment bridge present; recursor/positivity/projection refinement open |
| mutual-definitions | 45% | conditional environment bridge present; executable mutual recursion refinement open |
| typechecker | 36% | proof-surface bridge present; end-to-end executable refinement open |
| expression-tags | 60% | TrExprS constructor surface covered; executable translator refinement open |
| whnf-defeq | 43% | theory-level bridge present; executable algorithm refinement open |
| primitive-literals | 38% | primitive/literal proof-surface bridge present; reflection completeness open |
| codec-replay | 36% | Replay surface + codec stability gate present; full replay refinement open |
| resource-error-conservativity | 30% | fuel/error proof-surface bridge present; full conservativity open |
