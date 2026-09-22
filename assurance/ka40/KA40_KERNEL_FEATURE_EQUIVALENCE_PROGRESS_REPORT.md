# Kernel Feature Equivalence Progress — KA-40

Checkpoint: `proofscript-v1-ka40-primitive-literal-policy-bridge0`

## Headline percentages

- Feature-surface bridge progress: **58%**
- Executable-kernel equivalence proof progress: **26%**
- Arena corpus regression status: **100% retained from completed direct gates**
- Formal Lean4Lean bridge obligations: **114**

These percentages are conservative checkpoint metrics, not theorems of full Lean4 equivalence.

## Feature group progress

| Feature group | Progress | Status |
|---|---:|---|
| levels-universe-normalization | 65% | source-present plus earlier gates; executable refinement open |
| core-vexpr-six-constructor-theory | 80% | bridged for current formal VExpr slice |
| full-lean-expression-tags | 70% | TrExprS constructor surface covered; mvar/executable translator refinement open |
| ordinary-declarations | 85% | strong conditional environment bridge; executable addDecl refinement open |
| quot-declaration | 75% | environment bridge complete; semantic quotient computation open |
| mutual-definitions | 45% | conditional environment bridge present; executable checking open |
| inductive-declarations | 35% | first conditional environment bridge; positivity/recursors/nested open |
| recursor-reduction-iota-eta-k | 34% | WHNF/head-reduction preservation started; recursor/projection/iota open |
| type-inference-checking | 46% | TypeChecker proof-surface bridge; end-to-end executable refinement open |
| defeq-conversion-whnf | 50% | defeq algebra/monotonicity plus WHNF preservation bridged; conversion completeness open |
| environment-extension-ordering | 76% | ordinary/quotient/mutual/inductive slices bridged conditionally |
| primitive-axioms-literals | 40% | Nat/Bool/literal policy bridge added; executable primitive reflection open |
| kernel-codec-export-arena | 45% | arena evidence strong; codec/replay proof open |
| resource-fuel-error-semantics | 35% | source present; conservativity proof open |
| metatheory-typing-relations | 58% | defeq/typing monotonicity bridge added; global refinement map open |

## Next highest-impact milestones

- KA41-codec-replay-refinement
- KA42-resource-error-conservativity
- KA43-theory-wide-refinement-map
- KA44-primitive-reflection-executable-bridge
