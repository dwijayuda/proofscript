# ProofScript Kernel v69 Assurance Checkpoint — TYPING-BETA-ZETA1

**Profile:** `KERNEL-universe-conformance1`  
**Core format:** 69  
**Lean baseline:** 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Result

This checkpoint closes two additional non-circular formal slices without
changing trusted kernel semantics.

### 1. Conversion-free typing refinement

`ProofScriptKernelEquivalence.DirectTyping.typing_sound` proves PS→Lean typing
refinement for:

- `Sort`;
- de Bruijn bound variables;
- constant lookup under a related environment;
- application with an already-exposed matching domain;
- lambda;
- dependent `Pi`;
- `let` with direct type agreement.

The theorem reuses the previously proved Core→Lean `instantiate1` bridge.

### 2. Beta/zeta reduction refinement

`ProofScriptKernelEquivalence.BetaZeta.step_sound` proves that each primitive
beta or zeta head reduction translates to the corresponding Lean structural
step. `BetaZeta.steps_sound` lifts this to arbitrary finite chains of those
primitive head steps.

These theorems contain no `sorryAx`.

## Why this is not yet full typing or definitional equality

The production checker uses WHNF and definitional equality when checking
application arguments and let values. Full typing equivalence therefore depends
on the full O-DEF theorem. This checkpoint deliberately does not introduce a
conversion assumption merely to make O-TYP appear complete.

Likewise, beta/zeta head steps are only the beginning of Lean-compatible
`defEq`. Delta transparency, eta, proof irrelevance, contextual/congruence
closure, projections, recursors and quotients remain separate obligations.

## Executable cross-checks

- TypeScript direct typing: **1,000 / 1,000 passed**.
- Exact Lean 4.33.1 `Meta.inferType` + `Meta.checkWithKernel`: **1,000 / 1,000 passed**.
- TypeScript beta/zeta WHNF: **1,000 / 1,000 passed**.
- Exact Lean 4.33.1 beta/zeta WHNF: **1,000 / 1,000 passed**, with all source
  expressions also kernel-checked.
- TypeScript clean build: **passed**.
- Conformance smoke corpus: **passed**.
- Exact source-level Lean differential remains **23/25**, with the two known
  generated-Lean frontend/exporter failures (`reduction-recursion`,
  `equation-patterns`). Those are recorded but are not used as kernel-equivalence
  evidence.

## Next step

Prove **delta/transparency correspondence** next. That is the shortest route to
a combined beta+zeta+delta WHNF theorem for ordinary definitions, after which
eta and proof irrelevance can be added before returning to conversion-dependent
typing.
