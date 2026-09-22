# ProofScript Kernel v69 Assurance Checkpoint — Ordinary DefEq + Conversion 1

**Profile:** `KERNEL-universe-conformance1`  
**Core format:** 69  
**Lean baseline:** 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Result

This checkpoint closes the ordinary function/let definitional-equality and
conversion-typing foundation far enough to move into projection/recursor/quotient
correspondence. The shipped v69 kernel semantics were not changed.

## Machine-checked formal results

`DefEqOrdinary.lean` adds a logical ordinary equality fragment containing:

- finite beta/zeta/transparent-delta/application-head reduction;
- reflexivity, symmetry and transitivity;
- application and same-domain binder-body congruence;
- function eta;
- proof irrelevance.

It proves:

1. canonical eta expansion commutes with Core→Lean translation;
2. every ProofScript derivation in this ordinary equality fragment translates to
   the corresponding Lean-expression derivation.

`TypingConversion.lean` then proves PS→Lean refinement for basic
conversion-dependent typing of Sort/BVar/Const/App/Lam/Pi/Let. The construction
is deliberately non-circular: eta/proof-irrelevance in `DefEqOrdinary` use only
`DirectTyping`, and `ConversionTyping` consumes the already-defined equality
relation.

All modules compile under exact Lean 4.33.1 with no `sorryAx`.

## Exact executable evidence

| Campaign | ProofScript v69 | Lean 4.33.1 |
|---|---:|---:|
| eta/proof irrelevance | 1,000 / 0 failures | 1,000 / 0 failures |
| conversion-dependent typing | 1,000 / 0 failures | 1,000 / 0 failures |

Eta/proof-irrelevance includes 250 eta-positive, 250 eta-negative, 250
same-proposition proof-positive and 250 different-proposition negative controls.
The exact-Lean side performs 2,000 kernel checks.

Conversion-dependent typing exercises eta beneath a type constructor, proof
irrelevance beneath a dependent type constructor, beta, zeta and transparent
delta conversion. The exact-Lean side performs another 2,000 kernel checks.

## Important boundary

This checkpoint proves refinement against an explicit Lean-expression logical
relation and cross-checks the exact native implementation. It does **not** yet
prove that the entire Lean 4.33.1 native `isDefEq` implementation is equivalent
to that relation, nor that the shipped TypeScript control flow implements every
formal rule for all inputs. Those final bridges remain O-DEF/O-IMPL.

Projection, recursor/iota/K and quotient computation are not included here.

## Current classification

- O-TYP: `PARTIAL_PROVED_ORDINARY_CONVERSION`
- O-DEF: `PARTIAL_PROVED_ORDINARY_EQ_WITH_ETA_PROOF_IRREL`
- Whole-kernel K3 equivalence: **IN PROGRESS — NOT YET CLAIMED**

## Next

Proceed to projection typing and projection reduction correspondence. This is the
first remaining high-risk definitional-equality mechanism in the shared Core and
should be closed before recursor/iota/K and quotient work.
