# ProofScript Kernel v71 Assurance Checkpoint — Non-Mutual Inductive Integration 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends assurance evidence and formal correspondence only. It does not change the shipped v71 trusted kernel semantics.

## New machine-checked formal slice

`InductiveNonMutualIntegration.lean` connects the previously separate direct/indexed inductive obligations into one normalized non-mutual admission boundary.

It proves Core→Lean preservation of:

1. constructor-field universe admission with the Prop exemption;
2. WHNF/ordinary-defEq based uniform-parameter matching;
3. integrated field admission: field typing as a sort, universe ceiling, nonrecursive classification, and indexed strict positivity;
4. procedural/extensional recursor iota specifications;
5. the compact normalized non-mutual admission slice containing constructor result shape and optional recursor computation evidence.

The pinned formal stack is now **26 modules plus the target statement**, with **zero reported `sorryAx`**.

## Exact non-mutual integration bridge

The new bridge `kernel-inductive-nonmutual-integration-tests.ts` composes the exact Lean 4.33.1 evidence for:

- constructor-field universe ceilings and Prop exception;
- uniform-parameter definitional equality;
- direct raw inductive admission;
- parameterized/indexed raw inductive admission;
- indexed recursor WHNF/iota computation.

Result:

- field-universe admission: **PASS**;
- uniform-parameter defEq: **PASS**;
- direct admission: **6 positive + 4 negative**, **18 structural records**, **0 mismatches**;
- parameterized/indexed admission: **6 positive + 6 negative**, **19 structural records**, **0 mismatches**;
- indexed iota/WHNF: **6 cases**, **0 mismatches**, **6 kernel checks**;
- non-mutual integration failures: **0**.

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/indexed-iota — **PASS**
6. declaration/direct+indexed/non-mutual integration — **PASS**

Additional checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing. These are not counted as kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint **does not establish whole-kernel K3 equivalence**.

The remaining high-value non-mutual obligations are:

1. replace the normalized structural admission premises with one full generic WHNF/defEq admission theorem;
2. prove the field-universe ceiling/admission theorem generically across all non-mutual constructors;
3. prove generic generated recursor construction/type and extensional RHS/iota preservation beyond the covered corpus;
4. lift the result through whole-environment induction;
5. then extend to mutual and nested inductive families.

## Next target

Proceed with **generic non-mutual generated recursor construction/type + extensional RHS/iota theorem**, then whole-environment induction for non-mutual declarations.
