# ProofScript Kernel v71 Assurance Checkpoint — Non-Mutual Generated Recursor 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends assurance evidence and formal correspondence only.

## New formal slice

`RecursorNonMutualGenerated.lean` adds a generic generated-recursor boundary for normalized non-mutual inductive families.

It proves Core→Lean preservation of:

1. recursor result application: motive applied to result indices plus the major value;
2. final major-family application over parameters and indices;
3. generated recursor Π-telescope type spine;
4. generated minor-premise Π-telescope type spine;
5. constructor rule keys and field counts;
6. per-rule minor type and before/after extensional iota images;
7. whole generated non-mutual recursor packages.

The pinned formal stack is **27 modules plus the target statement**, with **zero reported `sorryAx`**.

## Extensional RHS boundary

Lean stores literal `RecursorRule.rhs` values. ProofScript v71 stores procedural recursor metadata and computes iota procedurally. This checkpoint therefore does **not** claim byte-identical internal RHS storage.

The claim is the appropriate extensional one for the current architecture:

- generated recursor declaration type matches structurally;
- generated minor-premise type shape matches structurally;
- constructor rule keys/counts match;
- applying the generated recursor to constructor majors has the same WHNF/iota result on the covered non-mutual direct/indexed corpus.

## Exact Lean evidence

`kernel-recursor-nonmutual-generated-tests.ts` composes the exact pinned raw-kernel corpora:

- direct non-mutual admission: **6 positive + 4 negative**, 18 structural records;
- parameterized/indexed direct admission: **6 positive + 6 negative**, 19 structural records;
- generated structural records total: **37**, **0 mismatches**;
- total admission corpus: **12 positive + 10 negative**, **0 failures**;
- negative admissions atomic: **10/10**;
- indexed WHNF/iota computation: **6 cases**, **6 kernel checks**, **0 mismatches**;
- dependent-indexed recursor completion and family BinderInfo observations remain green.

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/generated-recursor — **PASS**
6. declaration/direct+indexed/non-mutual integration — **PASS**

Additional release checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing; these remain outside kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint **does not establish whole-kernel K3 equivalence**.

Remaining O-IND/O-DECL work:

1. full generic non-mutual admission theorem integrating WHNF/defEq, field universe and positivity validation without normalized witness assumptions;
2. generic generated recursor construction from arbitrary accepted constructor lists, beyond witness structures;
3. whole non-mutual environment induction;
4. mutual inductive admission, positivity and generated recursor closure;
5. nested inductive preprocessing/admission and generated recursor closure.

## Next target

Proceed to **non-mutual whole-environment induction** if we keep the current normalized witness boundary, or deepen the formalization to a full generic non-mutual admission theorem before moving to mutual families.
