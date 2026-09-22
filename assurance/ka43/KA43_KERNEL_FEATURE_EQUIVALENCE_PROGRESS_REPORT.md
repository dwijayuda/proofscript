# Kernel Feature Equivalence Progress — KA-43

Checkpoint: `proofscript-v1-ka43-theory-wide-refinement-map0`

- Feature-surface bridge progress: **65%**
- Executable-kernel equivalence proof progress: **31%**
- Arena corpus regression evidence: **100% for completed direct gates**
- Formal Lean4Lean bridge obligations: **128**

These percentages are conservative checkpoint metrics, not full Lean4 equivalence claims.

| Feature group | Progress | Status |
|---|---:|---|
| ordinary-declarations | 82% | bridged proof-surface; executable refinement incomplete |
| quotients | 74% | environment bridge complete; semantic soundness incomplete |
| inductives | 35% | initial VInductDecl environment bridge only |
| mutual-definitions | 42% | initial VDecl.mutualDef environment bridge only |
| expression-tags | 62% | TrExprS constructor surface covered; executable translator not fully refined |
| typechecker-whnf-defeq | 44% | proof-surface bridges exist; executable checker refinement incomplete |
| primitive-literals | 38% | Nat/Bool/literal proof-surface bridge only |
| codec-replay | 33% | Replay surface and PS codec stability gates exist |
| resource-errors | 36% | fuel/error conservativity surface bridge only |
| architecture-health | 70% | no-spaghetti ratchet added; existing large modules inventoried |
