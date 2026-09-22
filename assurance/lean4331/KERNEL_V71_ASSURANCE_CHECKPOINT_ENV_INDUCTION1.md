# ProofScript Kernel v71 Assurance Checkpoint — Non-Mutual Whole-Environment Induction 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends formal correspondence and assurance evidence only.

## New formal slice

`EnvironmentNonMutualInduction.lean` connects the previously separate safe environment slices into one ordered normalized non-mutual environment construction theorem.

It defines a normalized `PSNonMutualPackage` as:

1. the already-generated environment entries to install atomically;
2. the generated non-mutual recursor specifications whose type/rule/iota bridge is supplied by `RecursorNonMutualGenerated.lean`.

The module proves:

- installing one normalized non-mutual package commutes with Core→Lean environment translation;
- installing a sequence of normalized non-mutual packages commutes with Core→Lean environment translation;
- exact universe-instantiated type lookup is preserved after the whole sequence;
- exact ordinary delta/transparency lookup is preserved after the whole sequence;
- the final installed environment still discharges the `DirectEnvSound` premise used by typing;
- the final installed environment still discharges the `DeltaEnvExact` premise used by delta/WHNF;
- every generated recursor carried by every package inherits the structural/extensional generated-recursion bridge.

The pinned formal stack is now **28 modules plus the target statement**, with **zero reported `sorryAx`**.

## Exact Lean bridge

A new reproducible bridge, `kernel-nonmutual-environment-induction-tests.ts`, composes the already-pinned exact Lean 4.33.1 components that this theorem connects:

1. ordinary declaration/environment lookup;
2. fresh quotient admission;
3. direct non-mutual inductive admission;
4. parameterized/indexed non-mutual inductive admission;
5. non-mutual integrated field/uniform-parameter/admission predicates;
6. generated non-mutual recursor structural/extensional bridge.

Result:

- **6 components**
- **0 failures**

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/generated-recursor — **PASS**
6. declaration/direct+indexed/non-mutual whole-environment induction — **PASS**

Additional checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing; these are not counted as kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint **does not establish whole-kernel K3 equivalence**.

It closes the normalized non-mutual whole-environment construction boundary, but still depends on the normalized/witnessed admission slices already stated in O-IND. Remaining high-value work before mutual/nested families:

1. remove normalized witness assumptions by proving the generic non-mutual admission theorem directly from raw declarations;
2. integrate WHNF/defEq and universe-ceiling validation into that generic theorem;
3. generalize generated recursor type/RHS/iota preservation beyond the pinned direct/indexed corpus;
4. connect the theorem to the actual TypeScript implementation correspondence layer.

## Next target

Proceed to **generic non-mutual admission theorem without normalized witness assumptions**, then mutual inductives, then nested inductives.
