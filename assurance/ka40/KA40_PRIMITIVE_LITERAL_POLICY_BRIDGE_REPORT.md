# KA-40 Primitive / Literal Policy Bridge Report

Checkpoint: `proofscript-v1-ka40-primitive-literal-policy-bridge0`

Public version: `1.0.0-pskernel.43`

Baseline: `proofscript-v1-ka39-defeq-whnf-refinement-bridge0`

## What changed

KA-40 adds a conditional direct Lean4Lean bridge for primitive and literal policy: VEnv.ContainsLits natVal, VEnv.ContainsLits strVal, VEnv.HasPrimitives.natZeroT, VEnv.HasPrimitives.natSuccT, VEnv.HasPrimitives.natLitT, VExpr.closedN_natLit, VEnv.HasPrimitives.natIsType, VEnv.HasPrimitives.trNat, VEnv.HasPrimitives.boolLitT, VEnv.HasPrimitives.boolIsType, VEnv.HasPrimitives.trBool.

## Machine-checked bridge lemmas

- `PSKernelKA40.translated_literal_policy_nat_requires_nat`
- `PSKernelKA40.translated_literal_policy_string_requires_primitives`
- `PSKernelKA40.translated_nat_zero_has_type`
- `PSKernelKA40.translated_nat_succ_has_type`
- `PSKernelKA40.translated_nat_literal_has_type`
- `PSKernelKA40.translated_nat_literal_closed`
- `PSKernelKA40.translated_nat_is_type`
- `PSKernelKA40.translated_nat_const_translates`
- `PSKernelKA40.translated_bool_literal_has_type`
- `PSKernelKA40.translated_bool_is_type`
- `PSKernelKA40.translated_bool_const_translates`

## Kernel feature equivalence progress

- Feature-surface bridge progress: **58%**
- Executable-kernel equivalence proof progress: **26%**
- Formal Lean4Lean bridge obligations: **114**

## Boundary

- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full primitive/literal policy refinement: **no**
- Formal Lean4Lean bridge obligations: **114**

## Remaining primitive / literal gaps

- end-to-end executable primitive checker refinement
- full string literal constructor expansion/refinement beyond policy prerequisites
- primitive arithmetic reflection completeness for Nat.pred/add/sub/mul/div/mod/bitwise families
- primitive Bool/Nat conditional/reflection executable soundness
- codec/replay proof that primitive/literal declarations are faithfully imported
- resource/error conservativity for primitive/literal checking
