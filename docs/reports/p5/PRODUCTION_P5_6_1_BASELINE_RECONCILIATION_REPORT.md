# Production P5.6.2 Baseline Reconciliation Report

## Summary

P5.6.2 is a controlled-feature baseline derived from the uploaded P5.6 Option archive. It keeps the real PSC-1 Option feature verified while separating P5-owned release claims from inherited P6/v71 String/K3-TB publish gates that are not part of the P5.6 Option release boundary.

## What P5.6.2 Supports

- `Option(A)` as a checked bootstrap feature.
- `Option.none(A)` and `Option.some(A, value)`.
- Exhaustive matching over `Option(Nat)`.
- JS backend execution smoke for Option values and matches.
- TypeScript backend compile/run smoke.
- `by rfl` theorem smoke for reducible Option computations.
- Negative checks for non-exhaustive Option matches and bad constructor payloads.

## What P5.6.2 Excludes

P5.6.2 does not classify inherited P6 String or v71 publish-preflight checks as P5 release blockers. Those gates remain useful future/inherited diagnostics, but they must not be used to invalidate the P5.6 Option controlled-feature baseline unless a root-cause investigation shows a shared P5 soundness bug.

## Trust Boundary

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.

## Verification Command

```bash
npm run verify:p5:controlled-release
```

This command intentionally runs P5-owned gates and excludes inherited P6/v71 gates.
