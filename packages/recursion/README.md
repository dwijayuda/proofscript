# @proofscript/recursion

Frontend-only structural-recursion compiler for ProofScript.

K2d recognizes a deliberately small recursive source shape and rewrites valid
recursive calls to induction-hypothesis markers consumed by the match elaborator.
It does not add a recursive-definition term or rule to the ProofScript kernel.


## Production Role

Compiles supported structural recursion source metadata.

## Trust Boundary

Tier: language  
Lifecycle: canonical  
Trust boundary: Source recursion analysis helper; kernel remains final checker.

This package is not the proof authority; the kernel remains the final checker for trusted Core validity.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
