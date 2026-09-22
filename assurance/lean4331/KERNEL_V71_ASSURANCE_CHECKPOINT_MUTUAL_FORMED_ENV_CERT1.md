# ProofScript Kernel v71 Mutual Formed-Environment Certificate

Status: **PASS**

Lean: `Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`

This checkpoint adds `assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveMutualFormedEnvironment.lean`, a formed-environment theorem for mutual inductive packages.  It proves that once the executable checker has atomically produced the family, constructor, recursor and auxiliary entries for a mutual block, installing those entries preserves the Core→Lean environment translation, direct constant-typing lookup and ordinary delta lookup.

## Executable evidence

The checkpoint reruns five exact Lean-backed mutual suites: direct mutual families, shared/dependent parameters, indices, higher-order mutual recursion, and mutual Prop behavior.  The source audit covers `packages/kernel/src/kernel.ts#checkDirectMutualInductive` with 39 obligations and zero missing obligations.

## Evidence files

- Formal Lean target: `assurance/lean4331/evidence/v71-mutual-formed-env-formal1.out`
- direct mutual suite: `assurance/lean4331/evidence/v71-mutual-direct-exact-lean1.out`
- parameters mutual suite: `assurance/lean4331/evidence/v71-mutual-parameters-exact-lean1.out`
- indices mutual suite: `assurance/lean4331/evidence/v71-mutual-indices-exact-lean1.out`
- higher-order mutual suite: `assurance/lean4331/evidence/v71-mutual-higher-order-exact-lean1.out`
- prop mutual suite: `assurance/lean4331/evidence/v71-mutual-prop-exact-lean1.out`
- Checkpoint JSON: `assurance/lean4331/CHECKPOINT_V71_MUTUAL_FORMED_ENV_CERT1.json`

## Claim boundary

This is not a full mutual positivity/admission theorem and not a formal mutual recursor RHS correspondence theorem.  It closes the formed mutual O-DECL environment-preservation layer and binds it to exact Lean-backed executable evidence for the current v71 mutual slices.
