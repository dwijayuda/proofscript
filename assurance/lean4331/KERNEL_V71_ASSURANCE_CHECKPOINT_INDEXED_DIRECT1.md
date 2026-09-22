# ProofScript Kernel v71 Assurance Checkpoint — Indexed Direct 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends formal correspondence and exact differential assurance only.

## New formal slice

`InductiveIndexedAdmission.lean` extends the normalized direct/non-mutual admission model to parameterized and indexed families. It proves Core→Lean preservation of:

1. application spines;
2. copied parameter telescopes;
3. exact uniform-parameter de Bruijn positions at field depth;
4. exact index arity;
5. nonrecursive index arguments;
6. normalized strictly-positive indexed recursive fields;
7. exact terminal constructor result-family shape.

`RecursorIndexed.lean` proves structural correspondence for direct indexed recursive-hypothesis assembly and fields-first indexed iota, and derives exact recursive-occurrence index arity.

The pinned formal stack is **25 modules plus the target statement**, with **zero reported `sorryAx`**.

## Exact parameterized/indexed admission differential

Raw `.inductDecl` declarations are submitted through actual pinned `Lean.addDecl` in fresh environments and compared with shipped v71.

Positive cases: **6/6 accepted**

- index-only family;
- parameter + index family;
- dependent two-index family;
- higher-order indexed recursion;
- multiple indices with two recursive fields;
- Eq-like universe-polymorphic family.

Negative cases: **6/6 rejected by both**

- mismatched parameter telescope;
- nonuniform result parameter;
- nonuniform recursive parameter;
- underapplied indexed result;
- wrong index type;
- incompatible family universe instantiation.

All six negative cases are atomic.

For accepted cases, **19 generated inductive/constructor/recursor structural records match with 0 mismatches** after positional alpha-normalization of generated recursor universe-parameter names.

## Exact indexed computation differential

Six indexed recursor applications are kernel-checked and reduced by exact Lean 4.33.1 using `Meta.whnf`, then compared with shipped v71 `kernelWhnf`.

Result:

- **6 cases**
- **6 kernel checks**
- **0 mismatches**

The corpus includes dependent-index, higher-order pointwise-IH, multi-index and Eq-like K behavior.

Lean stores literal `RecursorRule.rhs` values while ProofScript v71 stores procedural recursor metadata and computes iota procedurally. This checkpoint therefore establishes **generated recursor type/metadata correspondence plus extensional iota/WHNF correspondence for the covered slice**; it does not claim byte-identical stored RHS representation.

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/indexed-iota — **PASS**
6. declaration/direct+indexed admission — **PASS**

Additional release checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing; these are not counted as kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint **does not establish whole-kernel K3 equivalence**.

The remaining high-value non-mutual inductive obligations are:

1. integrate WHNF/definitional-equality parameter matching into one generic admission theorem;
2. prove the field-universe ceiling/admission rule generically;
3. prove generic generated recursor construction/type and extensional RHS/iota preservation beyond the pinned corpus;
4. lift the resulting theorem through whole-environment induction;
5. only then extend to mutual and nested inductive families.

## Next target

Proceed with **complete non-mutual inductive admission integration** before mutual/nested families.
