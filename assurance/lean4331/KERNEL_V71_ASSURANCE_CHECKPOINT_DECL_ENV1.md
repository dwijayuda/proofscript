# ProofScript Kernel v71 — Declaration / Environment Assurance Checkpoint 1

**Profile:** `KERNEL-level-instantiation-conformance1`  
**Core:** v71  
**Lean baseline:** 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Closed in this checkpoint

1. `DeclarationOrdinary.lean` proves structural installation/lookup correspondence for ordinary safe `axiom`, regular/abbrev `definition`, `theorem`, and `opaque` entries using the actual Lean `ConstantInfo` constructors.
2. Exact v71 universe-instantiated constant type lookup is proved and discharges the earlier `DirectEnvSound` premise.
3. Definition-only delta lookup is proved and discharges the earlier `DeltaEnvExact` premise; theorem/opaque/axiom remain stuck.
4. `DeclarationEnvironment.lean` unifies ordinary declarations and already-formed quotient primitives in one environment relation targeting actual `Lean.ConstantInfo` / `Lean.QuotVal` values.
5. Sequential/batch environment installation commutes with Core→Lean translation.
6. Combined ordinary+quotient type lookup is exact and quotient entries remain non-delta-unfolding.
7. Exact native implementation bridge: seven ordinary raw declarations are submitted by `Lean.addDecl`, their structural signatures match v71 line-for-line, and 1,000/1,000 universe-instantiated constant types match expression-for-expression with 1,000 exact kernel checks.
8. Duplicate ordinary declaration installation is rejected by both implementations without replacing the original entry.

## Formal theorem status

The dependency chain through `DeclarationEnvironment.lean` comprises **20 formal modules** and reports **zero `sorryAx`**. Standard Lean logical axioms such as `propext` / `Quot.sound` may appear in theorem axiom reports because the metatheory itself is written in Lean; there are no unproved `sorry` obligations in this checkpoint.

## What this does not claim

O-DECL is **partially**, not fully, closed. The following remain:

- exact quotient admission from canonical `Eq` / `Eq.refl` preconditions and atomic `.quotDecl` installation;
- inductive/constructor/recursor declaration admission and environment preservation;
- full inductive positivity/generated-recursor type/RHS correspondence;
- shipped TypeScript implementation ↔ formal checker proof;
- final whole-shared-domain bidirectional acceptance/type/defeq theorem.

No K3 whole-kernel equivalence claim is made.

## Next action

Close the quotient admission/atomic-initialization bridge first. It is compact, already has exact structural/computation evidence, and removes the final quotient-specific O-DECL premise before the much larger inductive environment theorem.
