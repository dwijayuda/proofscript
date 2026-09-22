# ProofScript Kernel v70 Assurance Checkpoint — Projection Conformance 1

Date: 2026-09-10

## Identity

- Core format: **70**
- Profile: **`KERNEL-projection-conformance1`**
- Certificate format: **2**
- Semantic oracle: **Lean 4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Status: **current kernel-equivalence candidate; whole-kernel K3 equivalence is not yet proved**

## Why v70 exists

The projection assurance campaign found a version-sensitive raw-kernel discrepancy
in v69.  For a proposition-valued one-constructor inductive whose first field is
data and whose later proof field depends on that data, historical v69 direct raw
projection inference accepted the later proof projection.  Exact Lean 4.33.1
`checkWithKernel` rejects it: reconstructing the later proof type would require a
forbidden data projection from a Prop-valued major.

The minimized control case matters: when the later proof field is independent of
the earlier data field, exact Lean accepts it.  Thus the correct rule is not
"reject every later field after data in Prop"; it is dependency-aware traversal.

v70 mirrors that rule.  Prior fields are materialized as raw projections only when
the remaining constructor telescope has a loose dependency on them.  On a Prop
major, a required data-valued prior projection is rejected.  Unused binders are
dropped without creating such a projection.  The target field is also required to
be proposition-valued when the major is Prop.

Historical v69 remains replayable under its own profile but is superseded as the
trusted-equivalence candidate.

## Machine-checked formal slice

`Projection.lean` compiles with exact Lean 4.33.1 and reports no `sorryAx`.
It establishes:

1. Core→Lean preservation of the loose-bound-variable dependency classifier;
2. Core→Lean preservation of dependency-aware constructor-field traversal;
3. preservation of the Prop-safety premise during that traversal, relative to a
   sound proposition classifier;
4. Core→Lean preservation of raw constructor projection/iota selection.

The theorem deliberately does **not** hide declaration installation inside the
claim.  The remaining projection bridge is to prove that installed
inductive/constructor metadata and proposition classification in both kernels
satisfy the formal traversal premises.  That belongs to O-DECL/O-PROJ.

## Exact executable evidence

Projection-specific:

- TypeScript projection differential: **1,000/1,000**, 0 failures;
- exact Lean raw-kernel differential: **1,000/1,000**, 0 failures;
- minimized raw Lean projection regression: passed;
- historical v69 dependent-proof counterexample: reproduced;
- v70 direct projection regression: passed;
- Core 70 codec round-trip and v69 universe-repair inheritance: passed.

The 1,000-case projection corpus covers repeated instances of:

- raw `numParams = 0`, `numIndices = 1` field typing;
- invalid raw projection indices;
- data-valued targets from Prop rejection;
- later proof fields that depend on forbidden Prop data rejection;
- independent later proof fields from Prop acceptance;
- constructor projection/iota reduction.

Previously established evidence remains green in the v70 assurance gate:

- 30,000 universe pairs / 60,000 exact universe-predicate comparisons;
- 5,000 ASCII universe-name ordering comparisons;
- 1,000 expression-operation cases;
- 1,000 TypeScript + 1,000 exact Lean direct typing cases;
- beta/zeta, delta/transparency, ordinary WHNF, eta/proof irrelevance, and
  conversion-dependent typing campaigns.

## Regression status

Passed after the v70 change:

- TypeScript project build;
- indexed projection suite;
- structure eta suite;
- Prop-elimination suite with exact Lean differential;
- dependent-field suite with exact Lean differential;
- indexed recursor suite;
- recursor-K suite with exact Lean differential;
- final conversion/WHNF audit with exact Lean observations;
- v68 resource-bound suite;
- conformance smoke corpus.

The source-level Lean differential remains **23/25**, with the same two known
frontend/generated-Lean cases (`reduction-recursion`, `equation-patterns`).  They
are not counted as kernel-equivalence evidence and are not concealed as passes.

## Formal obligation status

- O-LVL-EMBED: proved.
- O-LVL-NORM: exact differential strong; native normalization theorem bridge open.
- O-EXPR-EMBED / O-EXPR-LIFT-INST1: proved.
- O-TYP: ordinary conversion proved; projection field rule now proved separately;
  installed-environment integration remains open.
- O-DEF: ordinary fragment proved PS→Lean; projection iota separately proved;
  recursor/quotient/native-defeq closure remains open.
- O-PROJ: **partial proved — field walk + Prop gating + iota + exact native corpus**.
- O-DECL, O-IND, O-RES, O-IMPL: remain open.

## Claim boundary

This checkpoint supports:

> ProofScript Core v70 implements the corrected Lean-4.33.1-style raw projection
> dependency/Prop-gating behavior on the tested shared domain, and the structural
> projection field-walk/iota rules have a machine-checked Core→Lean refinement
> theorem.

It does **not** yet support:

> ProofScript Kernel v70 is fully equivalent to the Lean 4.33.1 kernel.

## Next highest-value work

Proceed to **inductive/recursor metadata correspondence and recursor/iota/K
reduction**, while closing the projection metadata/classifier premise as part of
the declaration/environment theorem.  Then do quotient correspondence, remaining
native defeq/context closure, resource metatheory, and shipped-TypeScript
implementation correspondence before any K3 equivalence claim.
