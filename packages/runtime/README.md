# @proofscript/runtime

PSC-1 JavaScript runtime helpers. This package owns executable value representation, not kernel checking or source elaboration.

Current live representation:

- `Nat`: nonnegative `bigint`
- `Bool`: JavaScript `boolean`
- `Unit`: `null`

Unsupported runtime families must fail closed in emitters/CLI until their semantics are specified and smoke-tested.


## Production Role

Provides JS/TS runtime helpers for Nat, Bool, structures, and inductives.

## Trust Boundary

Tier: execution  
Lifecycle: canonical  
Trust boundary: Executes already-checked terms; must not decide proof validity.

This execution package must not validate proofs; it only emits or runs already-checked Core artifacts.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
