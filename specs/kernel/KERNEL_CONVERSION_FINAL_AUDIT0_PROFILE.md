# KERNEL-conversion-final-audit0 profile

Core artifact format: **67**  
ProofScript language baseline: **v0.1.6**  
Semantic baseline: **Lean 4.33.1**, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile inherits Core 66 and closes the audited logical conversion/WHNF target. The final cross-product audit found one missing Lean reduction composition: after delta-unfolding a transparent function head, the exposed head may itself be a partially applied recursor, quotient recursor, or application that becomes reducible only after the caller's remaining arguments are appended. Core 67 re-flattens that rebuilt application spine and continues WHNF.

The continuation is enabled only by the v67 profile. It does not make opaque/theorem declarations reducible and does not alter historical Core v1-v66 behavior. Existing beta, zeta, delta/transparency, function eta, structure eta, proof irrelevance, projections, quotient computation, RecursorVal.k, and ordinary/indexed/mutual/nested recursor computation remain regression-covered.

The dedicated exact-Lean/replay gate is `tools/kernel-conversion-final-audit-tests.ts`.
