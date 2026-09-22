# @proofscript/verifier

Fresh-environment artifact replay. It has no dependency on plugin API, plugin host, frontend, compiler, or backends.


## Production Role

Replays artifacts using kernel, codec, and certificates.

## Trust Boundary

Tier: trusted  
Lifecycle: canonical  
Trust boundary: Standalone replay verifier; cannot import parser/elaborator/runtime/backend/plugin layers.

This package is TCB-adjacent and must not import runtime, backend, product, plugin, bridge, or experimental layers.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
