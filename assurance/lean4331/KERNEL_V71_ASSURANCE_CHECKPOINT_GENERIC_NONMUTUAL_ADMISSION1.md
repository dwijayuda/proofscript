# ProofScript Kernel v71 Assurance Checkpoint — Generic Non-Mutual Admission 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends only formal/evidence layers.

## New formal slice

`InductiveNonMutualGenericAdmission.lean` adds a generic raw-constructor admission boundary for the normalized non-mutual fragment.

Previous checkpoints carried normalized constructor-body or already-formed package witnesses.  This module starts from raw constructor type expressions and defines a checked body-admission predicate that:

1. peels the copied parameter telescope;
2. checks each field through the integrated field rule;
3. requires field typechecking as a sort;
4. carries the constructor-field universe ceiling and Prop exemption;
5. accepts either nonrecursive fields or strictly-positive recursive fields;
6. advances binder depth and local context through the constructor body;
7. terminates only at the exact indexed result-family shape.

It proves Core→Lean preservation for:

- raw constructor items;
- checked generic constructor-body admission;
- raw constructor admission;
- raw non-mutual family admission;
- checker-produced generic package installation through the existing ordered whole-environment theorem.

The effective formal stack is now **29 modules**: the inherited 28-module `ENV_INDUCTION1` stack plus the new generic raw-admission module.  The new module compiles under exact Lean 4.33.1 with **zero reported `sorryAx`**.

## Exact executable bridge

`kernel-inductive-nonmutual-generic-admission-tests.ts` recomposes the exact Lean 4.33.1 bridges that the new generic boundary depends on:

- integrated non-mutual admission predicates;
- generated non-mutual recursor structure/type/iota bridge;
- ordered non-mutual whole-environment induction bridge.

Result:

- direct raw admission inherited: **6 positive + 4 negative, 18 generated records, 0 mismatches**;
- parameterized/indexed raw admission inherited: **6 positive + 6 negative, 19 generated records, 0 mismatches**;
- generated non-mutual recursor bridge inherited: **37 generated records + 6 WHNF/iota checks, 0 mismatches**;
- ordered environment bridge inherited: **6 components, 0 failures**;
- composed generic bridge: **`GENERIC_NONMUTUAL_ADMISSION_FAILURES=0`**.

## Release checks

All six bounded mandatory v71 assurance gates pass:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/generated-recursor — **PASS**
6. declaration/direct+indexed/non-mutual/generic admission — **PASS**

Additional checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing. These are not counted as kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This is **not** whole-kernel K3 equivalence.

This checkpoint removes a meaningful normalized-witness assumption at the raw constructor boundary, but it does **not** yet prove the implementation-complete normalizer/classifier theorem for every possible non-mutual Lean input.  The remaining non-mutual work is:

1. prove that the shipped WHNF/defEq-driven normalizer and classifier produce exactly these structural obligations on every accepted non-mutual input;
2. prove the field-universe classifier complete for all accepted field sorts, not just the pinned representative corpus;
3. prove generic generated recursor construction/type and extensional RHS/iota beyond the current bounded corpus;
4. close the resulting implementation-to-formal correspondence theorem;
5. then move to mutual and nested inductives.

## Next target

Proceed with the **implementation-complete non-mutual normalizer/classifier correspondence** before starting mutual inductives.
