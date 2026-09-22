# P5.56 Except.swap Feature Report

## Summary

P5.56 promotes `Except.swap(E, A, value): Except(A, E)` as a PSC-1 checked-bootstrap helper. It swaps `Except.error` into `Except.ok` in the swapped type and swaps `Except.ok` into `Except.error` in the swapped type.

## Checked semantics

The bootstrap definition is expressed through existing `Except.rec`; no new kernel primitive, kernel refactor, or kernel restructuring is introduced.

```text
Except.swap(E, A, Except.error(E, A, e)) => Except.ok(A, E, e)
Except.swap(E, A, Except.ok(E, A, x))    => Except.error(A, E, x)
```

## Evidence

- Focused red/green test: `tools/pslive-except-swap-tests.ts`.
- Checked bootstrap source/artifact: `packages/std/src/Bootstrap/Foundation.ps`, `packages/std/core/bootstrap.pscore.json`.
- Foundation replay: `tools/k1d-foundation-tests.ts`.
- Backend/runtime: `packages/backend-typescript/src/termEmitter.ts`, `packages/runtime/src/source.ts`, `packages/runtime/src/profile.ts`.
- Governance: feature-promotion gate, verification matrix, traceability bundle, proof-obligation ledger, development workflow, and production readiness status.

## Elaborator extraction

P5.56 also extracts class and instance declaration elaboration into `packages/elaborator/src/classElaborator.ts`, reducing the central `packages/elaborator/src/index.ts` file while preserving behavior.

## Trust boundary

Trust remains K3-TB trusted-boundary only. This milestone is not fully formal K3, does not prove full Lean 4 equivalence, and adds no formal Lean 4 equivalence proof obligations; the proved count remains 0.
