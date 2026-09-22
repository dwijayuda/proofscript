# @proofscript/kernel

Active package: **ProofScript pskernel-derived TypeScript kernel**.

Trust label: **trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet**.

This package replaces the old compact K3-TB kernel layout with a TypeScript mirror of the uploaded `pskernel` folder/file structure. The goal is to let ProofScript eventually live without Lean 4 installed while preserving Lean 4.33.1 semantics. Until the equivalence work is completed, unsupported slices must fail closed and proof files are represented as proof obligations, not fake TypeScript proofs.

The previous K3-TB source has been quarantined under `legacy/kernel-k3tb-v71` outside the active package. Compatibility exports are preserved only where downstream packages still need the public `@proofscript/kernel` API during the package rewrite phases.


## Production Role

Checks explicit Core declarations and maintains K3-TB kernel state.

## Trust Boundary

Tier: trusted  
Lifecycle: canonical  
Trust boundary: TCB-adjacent kernel checker; no ProofScript package imports allowed.

This package is TCB-adjacent and must not import runtime, backend, product, plugin, bridge, or experimental layers.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
