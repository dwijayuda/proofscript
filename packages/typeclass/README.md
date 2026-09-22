# @proofscript/typeclass

K2p implements the frontend/environment registry for global ProofScript classes and concrete instances. Classes may have explicit parameters; instances must currently target a fully applied class such as `Default(Nat)`. Candidate ordering is higher priority first, then more-recent declaration first for ties. Exact-goal search is parameter-sensitive and the kernel verifies the selected candidate type before Core insertion.

This package is outside the trusted kernel. It cannot register logical rules. Polymorphic instance declaration binders, recursive prerequisites, local/scoped instances, output parameters, defaults and tabling are later milestones.


## Production Role

Supports limited typeclass metadata used by elaboration.

## Trust Boundary

Tier: language  
Lifecycle: canonical  
Trust boundary: Deterministic metadata and candidate ordering, not proof authority.

This package is not the proof authority; the kernel remains the final checker for trusted Core validity.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
