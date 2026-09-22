# ProofScript Kernel v69 Assurance Checkpoint — TYPING-DIRECT1

**Profile:** `KERNEL-universe-conformance1`  
**Core format:** 69  
**Lean baseline:** 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Result

The first kernel-typing refinement theorem is now machine checked.

`ProofScriptKernelEquivalence.DirectTyping.typing_sound` proves the one-way
soundness direction for the conversion-free shared typing rules:

- `Sort`;
- de Bruijn bound variables;
- constant lookup under a related environment;
- application when the domain is already exposed and matches directly;
- lambda;
- dependent `Pi`;
- `let` with direct type agreement.

The proof reuses the already-closed Core→Lean `instantiate1` theorem and has no
`sorryAx` dependency.

## Why the theorem is intentionally one-way and conversion-free

The production v69 checker uses WHNF and definitional equality when checking
application arguments and let values. Proving those cases fully before the
O-DEF theorem would create a circular assurance argument. This checkpoint
therefore proves the maximal non-circular typing slice first.

The primary trust theorem is PS→Lean refinement: ProofScript must not certify a
judgment outside Lean's accepted shared theory. Lean→PS completeness is still a
later obligation and must account for ProofScript resource exhaustion.

## Executable cross-check

Two independent 1,000-case generated campaigns were run over the same direct
constructor families (Sort/Pi/Lam/App/Let):

- shipped TypeScript kernel: **1,000 / 1,000 passed**;
- exact Lean 4.33.1 `Meta.inferType` plus `Meta.checkWithKernel`: **1,000 / 1,000 passed**.

This supports, but does not replace, the formal theorem.

## Status after this checkpoint

`O-TYP` moves from `OPEN_FORMAL` to `PARTIAL_PROVED_DIRECT_CORE`.

Whole-kernel K3 equivalence is **not** yet established. The next dependency to
close is definitional equality, beginning with beta and zeta; those rules unlock
the conversion-dependent application and let typing correspondence.
