# @proofscript/backend-typescript

PSC-1 JavaScript emitter for already-checked Core artifacts.

Boundary rules:

- This package does not parse source.
- This package does not elaborate source.
- This package does not check theorem truth.
- It emits JavaScript only after the caller supplies a kernel-checked artifact.
- Unsupported executable Core fails closed.


## Production Role

Canonical PSC-1 JavaScript/TypeScript backend.

## Trust Boundary

Tier: execution  
Lifecycle: canonical  
Trust boundary: Emits JS/TS from checked Core only; must not validate proofs.

This execution package must not validate proofs; it only emits or runs already-checked Core artifacts.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
