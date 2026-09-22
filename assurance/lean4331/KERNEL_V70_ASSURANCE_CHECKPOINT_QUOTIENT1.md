# ProofScript Kernel v70 Assurance Checkpoint — Quotient 1

Date: 2026-09-10

## Identity

- Core format: **70**
- Profile: **`KERNEL-projection-conformance1`**
- Certificate format: **2**
- Semantic oracle: **Lean 4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantic change in this checkpoint: **none**
- Status: **current equivalence candidate; whole-kernel K3 equivalence is not yet proved**

## Machine-checked quotient slice

`Quotient.lean` introduces a small ProofScript shadow of the four quotient kinds and an explicit correspondence relation to the actual pinned `Lean.QuotVal`. Under that relation it proves exact agreement of primitive name, universe parameters, complete translated type and quotient kind. It separately proves Core→Lean preservation of the trusted `Quot.lift` and `Quot.ind` computation rules, including applications occurring after the quotient major. No theorem in the module uses `sorryAx`.

The formal relation intentionally does not pretend that quotient installation has already been proved. The exact `Eq`/`Eq.refl` prerequisite checks, atomic insertion of the four primitives, and environment extension remain part of O-DECL.

## Exact structural differential

The new exact fixture reads the **actual** `Lean.QuotVal` objects for `Quot`, `Quot.mk`, `Quot.lift`, and `Quot.ind` from the pinned Lean 4.33.1 environment and serializes their full shared-domain expression trees canonically. The TypeScript test independently serializes the primitives emitted by `generateQuotientPrimitives()`.

Compared fields include name, universe parameters, `QuotKind`, every universe level, every binder class and the complete de Bruijn expression structure. Result: **4/4 lines identical, zero mismatch**.

## Computation differential

Both implementations execute **500 `Quot.lift` + 500 `Quot.ind` cases** with zero failures. Half are basic quotient redexes and half apply an additional argument after the major, checking the exact rest-application behavior used by Lean's quotient reducer. Exact Lean performs **1,000 kernel checks**.

The older quotient suite is retained for orthogonal admission evidence: canonical Eq precondition, duplicate protection, atomicity, malformed marker rejection, `Quot.sound` axiom policy, and exact Lean primitive/type/computation smoke tests remain green.


## Broader regression replay

- TypeScript project build: **passed**.
- Conformance smoke corpus: **passed**.
- Exact source-level Lean differential: **23/25**, unchanged from the preceding checkpoint.
- The two failures remain the already-classified generated-Lean/frontend boundary cases `reduction-recursion` and `equation-patterns`; they are not counted as kernel-equivalence failures or hidden as passes.
- No trusted kernel source changed in this checkpoint.
- The monolithic v70 assurance gate exceeded this execution window **after all checks through projection had passed** and is not counted as a pass. Its remaining recursor/quotient tail was replayed as explicit bounded commands; every command exited successfully and no timeout was counted as success.

## Formal obligation movement

- New O-QUOT status: **`PARTIAL_PROVED_PRIMITIVE_METADATA_IOTA_PLUS_NATIVE_DIFFERENTIAL`**.
- O-DEF now explicitly includes the machine-checked quotient iota slice.
- O-DECL remains open for quotient initialization/environment preservation and is now the next highest-value bridge.

## Claim boundary

This checkpoint supports:

> ProofScript v70's four quotient primitive structures agree exactly with pinned Lean 4.33.1 in the recorded shared representation, and the trusted `Quot.lift`/`Quot.ind` iota rules have a machine-checked Core→Lean structural refinement theorem.

It does **not** support a whole-kernel equivalence claim.

## Next highest-value work

Proceed to **O-DECL declaration/environment preservation**, beginning with quotient installation and generic constant universe instantiation. This is more valuable than adding another isolated reduction theorem because the same environment bridge is a premise of existing delta, projection and recursor correspondence results.
