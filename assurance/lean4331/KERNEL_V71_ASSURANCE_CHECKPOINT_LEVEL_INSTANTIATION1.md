# ProofScript Kernel v71 Assurance Checkpoint — Level Instantiation 1

## Status

**PASS as an assurance checkpoint; whole-kernel K3 equivalence is still in progress.**

Current trusted-equivalence candidate:

- Core format **71**
- profile **`KERNEL-level-instantiation-conformance1`**
- certificate format **2**
- Lean **4.33.1**
- Lean commit **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**

Core v71 supersedes v70 for exact trusted-use because v70's level-parameter substitution could
preserve raw changed `max`/`imax` shapes where exact Lean 4.33.1 rebuilds through cheap
constructors. The repair does not relabel historical artifacts; v68, v69 and v70 remain replayable
under their own profiles.

## New machine-checked result

The v71-specific formal model now matches the shipped substitution design rather than the older
raw structural model:

- `LevelInstantiationV71.lean` models parameter lookup, parameter occurrence, cheap `max`, cheap
  `imax`, and level substitution.
- `ExprLevelInstantiationV71.lean` lifts the operation through every shared Core expression
  constructor.
- Core→Lean structural correspondence is proved for both layers.
- Exact Lean 4.33.1 compiles the complete 18-module formal stack with no `sorryAx`.

This closes the level/expression universe-substitution primitive needed by O-DECL. It does **not**
yet prove that declaration installation and environment lookup preserve the whole cross-kernel
relation.

## Exact executable evidence

- 30,000 generated universe pairs / 60,000 exact predicate comparisons — zero mismatch.
- 5,000 universe-name ordering comparisons — zero mismatch.
- v71 level substitution — 1,000 exact Lean comparisons, zero mismatch.
- v71 shared-expression level substitution — 1,000 exact Lean comparisons, zero mismatch.
- expression lift/instantiate1 — 1,000 recorded exact comparisons, zero mismatch.
- direct typing, beta/zeta, delta/transparency, ordinary WHNF, eta/proof irrelevance,
  conversion-dependent typing, and raw projections retain their exact Lean differential gates.
- seven direct recursor metadata shapes agree line-for-line.
- quotient primitive structure agrees line-for-line; 1,000 computation cases per implementation pass.

## Broader regressions

The canonical runner's tool families were executed as bounded explicit-exit groups:

- trusted kernel/architecture families: **58/58 passed**;
- frontend/tooling families: **31/31 passed**;
- conformance smoke corpus: **passed**.

The source-level Lean differential remains **23/25** because of the pre-existing generated-Lean
frontend/exporter cases `reduction-recursion` and `equation-patterns`. This aggregate is explicitly
not used as kernel-equivalence evidence.

## Mandatory assurance gate

The v71 gate is split into four mandatory parts to avoid treating execution-window exhaustion as
success:

```bash
PROOFSCRIPT_LEAN_BIN=/path/to/exact/lean node tools/kernel-v71-assurance-gate.ts --part=1
PROOFSCRIPT_LEAN_BIN=/path/to/exact/lean node tools/kernel-v71-assurance-gate.ts --part=2
PROOFSCRIPT_LEAN_BIN=/path/to/exact/lean node tools/kernel-v71-assurance-gate.ts --part=3
PROOFSCRIPT_LEAN_BIN=/path/to/exact/lean node tools/kernel-v71-assurance-gate.ts --part=4
```

All four parts pass. In environments without a short outer execution limit, omitting `--part`
runs all four sequentially.

## Next formal priority

**O-DECL declaration/environment preservation.** Start with ordinary safe declarations and their
universe-instantiated lookup relation, then quotient primitive installation, then connect installed
environment facts to delta, projection and recursor metadata premises.

Do not claim K3 until O-DECL, the remaining inductive/environment bridge, resources,
implementation correspondence, and the final bidirectional theorem are closed.
