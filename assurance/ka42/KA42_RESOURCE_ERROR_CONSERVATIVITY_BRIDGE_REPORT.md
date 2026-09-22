# KA-42 Resource / Error Conservativity Bridge Report

Checkpoint: `proofscript-v1-ka42-resource-error-conservativity-bridge0`

Public version: `1.0.0-pskernel.45`

Baseline: `proofscript-v1-ka41-codec-replay-refinement-bridge0`

## What changed

KA-42 imports real Lean4Lean TypeChecker/FuelConfig and adds wrapper obligations showing explicit fuel defaults and zero-recursion-fuel failure behavior as `deepRecursion`, plus an `Except.error` non-success conservativity lemma.

## Machine-checked bridge lemmas

- `PSKernelKA42.translated_default_rec_depth_policy`
- `PSKernelKA42.translated_default_whnf_policy`
- `PSKernelKA42.translated_default_lazy_delta_policy`
- `PSKernelKA42.translated_zero_fuel_whnf_deep_recursion`
- `PSKernelKA42.translated_zero_fuel_whnfCore_deep_recursion`
- `PSKernelKA42.translated_zero_fuel_inferType_deep_recursion`
- `PSKernelKA42.translated_zero_fuel_isDefEqCore_deep_recursion`
- `PSKernelKA42.translated_except_error_not_success`

## Progress

- Feature-surface bridge progress: **63%**
- Executable-kernel equivalence proof progress: **30%**
- Formal Lean4Lean bridge obligations: **128**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full resource/error conservativity: **no**

## Remaining resource/error gaps

- full executable PSKernel checker resource/error refinement against Lean4Lean TypeChecker.M.run
- full deterministicTimeout coverage for whnf unfold loops and lazyDelta loops
- memory-exhaustion and interruption conservativity
- resource/error equivalence for importer/replay/codec parsing failures
- proof that PSKernel never maps Lean4Lean resource exhaustion to acceptance
- end-to-end Arena runner crash/timeout/decline policy refinement
