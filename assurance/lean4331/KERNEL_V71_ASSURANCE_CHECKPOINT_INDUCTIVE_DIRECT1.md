# ProofScript Kernel v71 Assurance Checkpoint — Direct Inductive Admission 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends assurance evidence and formal correspondence only. It does not change the shipped v71 trusted kernel semantics.

## New machine-checked formal slice

`InductiveDirectAdmission.lean` adds a bounded normalized direct/non-mutual inductive-admission model and proves:

1. Core→Lean translation preserves syntactic occurrences of the inductive family constant.
2. Normalized strictly-positive recursive field structure translates to the corresponding Lean structure.
3. Direct constructor shape with an exact terminal result-family constant translates soundly.
4. Fields classified nonrecursive in the ProofScript model remain nonrecursive after translation.

`DeclarationRecursorMetadata.lean` gives a structural Core image of already-formed `Lean.RecursorRule` and `Lean.RecursorVal` values. `DeclarationEnvironment.lean` now includes formed recursor entries, so the structural environment relation covers every safe `Lean.ConstantInfo` kind represented by the shared ProofScript logical environment: ordinary declarations, quotients, inductives, constructors, and recursors.

The full pinned formal dependency chain is **23 modules plus the target statement**, with **zero reported `sorryAx`**.

## Exact direct-inductive differential

The native differential submits direct inductive declarations to the actual pinned Lean 4.33.1 kernel and compares them with the shipped v71 checker.

Positive cases: **6/6 accepted**

- nonrecursive one-constructor family;
- direct recursive list-like family;
- higher-order strictly-positive recursive field;
- empty family;
- Prop-valued family;
- universe-polymorphic family.

Negative cases: **4/4 rejected by both**

- recursive occurrence in a negative function position;
- constructor with the wrong result family;
- constructor field violating the family universe ceiling;
- duplicate constructor name.

All four negative cases are **atomic**: no family/constructor/recursor tail entries remain installed after rejection.

For accepted cases, **18 generated inductive/constructor/recursor structural records** match exact Lean with **0 mismatches** after canonicalizing generated recursor universe-parameter names by position. This normalization is representation-only: generated universe binder names are alpha-renamable and universe instantiation is positional.

## Release checks

- TypeScript project build: **PASS**
- ProofScript conformance smoke corpus: **PASS**
- v71 mandatory gate part 1 — foundation/formal: **PASS**
- part 2 — level/expression instantiation: **PASS**
- part 3 — typing/reduction: **PASS**
- part 4 — conversion/projection: **PASS**
- part 5 — recursor/quotient: **PASS**
- part 6 — declaration/direct-inductive environment: **PASS**

No timeout is interpreted as success; each gate part has an explicit successful exit status.

## Claim boundary

This checkpoint **does not establish whole-kernel K3 equivalence** and does not claim the entire Lean inductive-admission algorithm has been formalized.

Still open inside O-IND include:

- parameterized/indexed direct-family admission correspondence;
- integration of WHNF/definitional equality into the positivity/admission theorem;
- the exact field-universe/admission theorem depending on the remaining universe-normalization bridge;
- mutual and nested positivity/admission;
- exact generated recursor type/RHS correspondence and full indexed/mutual/nested recursor closure.

## Next bounded target

Proceed to **parameterized/indexed direct inductives**: constructor result-family parameter/index alignment, generated constructor metadata, indexed recursor metadata and admission/rejection parity. Only after that should the assurance campaign expand to mutual/nested families.
