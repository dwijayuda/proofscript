# KERNEL-mutual-nested-indexed-containers0 profile

Core v55 extends the one-level v50-v54 mutual/nested preprocessing graph to nested containers with their own index telescopes.

## Trusted rule

For a constructor field of the form `C.{ls} (M.{us} sharedParams fixedTargetIndices) containerIndices`, where `M` is a member of the current mutual block and `C` is an already-admitted inductive with exactly one parameter and at least one index, the kernel may synthesize a helper family whose shared parameters are the mutual shared parameters and whose indices are exactly `C`'s checked index telescope. The enlarged mutual block is rechecked atomically by the existing trusted mutual checker.

The target specialization may depend only on the shared mutual parameter context. Container index expressions are retained as helper indices. In this bounded profile, container index domains must not depend on the recursive mutual target. Explicit universe arguments are preserved and checked.

Both Type-valued and Prop-valued blocks are supported; Prop blocks inherit the existing shared Prop-only motive policy. No frontend/helper-eligibility flag is trusted.

## Architectural boundary

Lean source declarations whose constructor-local Prop target indices appear accepted under default elaboration are auto-promoted into uniform parameters before kernel admission. With `inductive.autoPromoteIndices false`, Lean 4.33.1 rejects that local nested target. ProofScript therefore does not add such auto-promotion to the standalone kernel.
