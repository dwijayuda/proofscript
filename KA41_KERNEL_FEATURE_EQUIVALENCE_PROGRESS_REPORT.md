# Kernel Feature Equivalence Progress — KA-41

Checkpoint: `proofscript-v1-ka41-codec-replay-refinement-bridge0`

- Feature-surface bridge progress: **61%**
- Executable-kernel equivalence proof progress: **28%**
- Arena corpus regression evidence: **100% for completed direct gates**
- Formal Lean4Lean bridge obligations: **120**

These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.

| Feature group | Progress | Status |
|---|---:|---|
| ordinary-declarations | 78% | aggregate bridges complete for ordinary declaration surface |
| quotient-declarations | 72% | environment/lookup/defeq bridges complete; semantic soundness still open |
| inductive-declarations | 35% | first conditional env bridge only |
| mutual-definitions | 40% | first conditional env bridge only |
| typechecker-executable-surface | 35% | TypeChecker proof-surface wrappers present; executable refinement open |
| expression-translation | 55% | TrExprS constructor surface covered; executable translator open |
| whnf-defeq | 38% | theory-level WHNF/defeq bridges partial |
| primitive-literal-policy | 32% | primitive/literal proof-surface bridge started |
| codec-replay | 24% | replay/context and codec stability gates started |
| resource-error-conservativity | 12% | mostly open |
