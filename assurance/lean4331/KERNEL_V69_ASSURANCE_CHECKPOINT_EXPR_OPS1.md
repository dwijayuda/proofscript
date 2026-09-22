# ProofScript Kernel v69 — Assurance checkpoint `expr-ops1`

## Identity

- Trusted Core: **v69**
- Profile: **`KERNEL-universe-conformance1`**
- Certificate format: **2**
- Semantic baseline: **Lean 4.33.1**
- Lean commit: `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

Historical v68 remains immutable evidence, but is superseded for trusted use. The
assurance campaign produced an exact Lean 4.33.1 counterexample in which v68
accepted a constructor-field universe relation that Lean rejected. v69 repairs
that trusted-semantic discrepancy without changing the inherited v68 resource
policy.

## Newly closed formal slice

`ExprOperations.lean` now machine-proves, with exact Lean 4.33.1 and no
`sorryAx`, that the canonical ProofScript Core→Lean structural translation
commutes with:

1. positive de Bruijn lifting; and
2. outer-binder instantiation (`instantiate1`) via the explicit structural
   reference model.

The exact native Lean operations are kept as a separate bridge because the
runtime implementation path is not treated as propositionally transparent.
The pinned native differential corpus currently records:

- 500 lift cases / 0 failures;
- 500 `instantiate1` cases / 0 failures.

## Existing universe evidence retained

- 30,000 generated level pairs;
- 60,000 exact `Level.isEquiv` / `Level.geq` comparisons;
- 0 mismatches;
- 5,000 valid ASCII universe-name ordering comparisons / 0 mismatches;
- exact Lean rejects the historical-v68 universe-admission counterexample;
- v69 rejects the same counterexample.

## Gates executed for this checkpoint

- TypeScript project build: **PASS**
- dedicated universe-equivalence kernel regression: **PASS**
- ProofScript conformance smoke corpus: **PASS**
- v69 assurance gate: **PASS**
- formal bridge compilation with no reported `sorryAx`: **PASS**

A monolithic `npm test` run was also started; it progressed through the trusted
kernel families into the K3b tests before the execution wrapper timeout. This is
not recorded as a failed semantic test. The current checkpoint did not change
kernel semantics after the already-tested v69 universe repair; it changes formal
assurance sources/gates only.

The source-level Lean differential remains 23/25 because the known
`reduction-recursion` and `equation-patterns` generated-Lean exporter cases are
rejected. They are frontend/exporter issues and are explicitly not counted as
kernel-equivalence evidence.

## Claim boundary

This checkpoint **does not** establish whole-kernel equivalence (K3). The
strongest current statement is:

> ProofScript Core v69 is the current trusted-kernel candidate targeting pinned
> Lean 4.33.1 semantics. Its repaired universe layer has clean exact differential
> evidence, and the formal correspondence campaign now includes the shared
> expression embedding plus de Bruijn lift and outer-binder instantiation.

## Next formal priority

The next high-value theorem block is the basic shared-Core typing relation for
`Sort`, `BVar`, `Const`, `App`, `Lam`, `Pi`, and `Let`, followed by the matching
basic definitional-equality reductions. Projection, inductives/recursors,
quotients, environment preservation, resource refinement, and shipped-TypeScript
implementation correspondence remain subsequent K3 obligations.
