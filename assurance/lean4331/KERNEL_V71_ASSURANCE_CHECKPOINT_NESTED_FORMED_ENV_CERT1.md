# ProofScript Kernel v71 Nested Formed-Environment Certificate

Status: **PASS**

Lean: `Lean (version 4.33.1, x86_64-unknown-linux-gnu, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)`

This checkpoint adds `assurance/lean4331/formal/ProofScriptKernelEquivalence/InductiveNestedFormedEnvironment.lean`, a formed-environment theorem for nested-inductive preprocessing packages.  It proves that once the executable checker has atomically produced the public outer family, helper families, restored constructors, recursors and auxiliary entries for a nested preprocessing package, installing those entries preserves the Core→Lean environment translation, direct constant-typing lookup and ordinary delta lookup.

## Executable evidence

The checkpoint reruns 9 exact Lean-backed nested suites covering one-level nested preprocessing, parameters, indices, index expressions, multiple specializations, polymorphism, indexed containers, deeper linear nesting and generalized multi-parameter nested graphs.  The source audit covers `packages/kernel/src/kernel.ts#tryCheckNestedInductive` with 31 obligations and zero missing obligations.

## Evidence files

- Formal Lean target: `assurance/lean4331/evidence/v71-nested-formed-env-formal1.out`
- base nested suite: `assurance/lean4331/evidence/v71-nested-base-exact-lean1.out`
- parameters nested suite: `assurance/lean4331/evidence/v71-nested-parameters-exact-lean1.out`
- indices nested suite: `assurance/lean4331/evidence/v71-nested-indices-exact-lean1.out`
- index-expressions nested suite: `assurance/lean4331/evidence/v71-nested-index-expressions-exact-lean1.out`
- multiple-specializations nested suite: `assurance/lean4331/evidence/v71-nested-multiple-specializations-exact-lean1.out`
- polymorphic nested suite: `assurance/lean4331/evidence/v71-nested-polymorphic-exact-lean1.out`
- indexed-containers nested suite: `assurance/lean4331/evidence/v71-nested-indexed-containers-exact-lean1.out`
- deeper-generalization nested suite: `assurance/lean4331/evidence/v71-nested-deeper-generalization-exact-lean1.out`
- deep-multiparam-generalization nested suite: `assurance/lean4331/evidence/v71-nested-deep-multiparam-generalization-exact-lean1.out`
- Checkpoint JSON: `assurance/lean4331/CHECKPOINT_V71_NESTED_FORMED_ENV_CERT1.json`

## Claim boundary

This is not a full nested positivity/preprocessing completeness theorem and not a formal nested recursor RHS correspondence theorem.  It closes the formed nested O-DECL environment-preservation layer and binds it to exact Lean-backed executable evidence for the current v71 nested preprocessing slices.
