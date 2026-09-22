# @proofscript/environment

Checked environment/prelude loading for the standalone ProofScript frontend.

The package decodes a core artifact and sends every declaration through `@proofscript/kernel` before exposing declaration names/universe parameters to the untrusted elaborator.

It also provides exact-standard-bootstrap recognition used by Lean export/oracle tooling. Recognition is structural/exact over the normalized checked declaration prefix; arbitrary user declarations with the same names are not silently treated as Lean built-ins.


## Production Role

Builds checked initial environments from std artifacts.

## Trust Boundary

Tier: language  
Lifecycle: canonical  
Trust boundary: Loads checked prelude artifacts through codec/kernel; no source elaboration authority.

This package is not the proof authority; the kernel remains the final checker for trusted Core validity.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
