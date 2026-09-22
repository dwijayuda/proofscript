# Production P4.75 — Cleanup Refactor Roadmap

P4.75 is a cleanup/refactor planning and baseline milestone. It adds no kernel rule, no syntax feature, no backend semantic feature, and no Lean-equivalence claim.

## Scope

- Parser split roadmap.
- Backend/runtime split roadmap.
- `pslive` tooling cleanup roadmap.
- Verification tiers.
- K3-TB trust-boundary preservation.

## Trust boundary

This remains K3-TB trusted-boundary work. Formal Lean 4 equivalence remains 0 proven obligations.

## Verification tiers

- Tier A fast: targeted cleanup tests, build, standalone small smoke, kernel smoke, `pskernel status`.
- Tier B normal: Tier A plus language fast suite and governance.
- Tier C release: Tier B plus K3-TB publish verification when `PROOFSCRIPT_LEAN_BIN` is available.
