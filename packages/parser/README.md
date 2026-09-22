# @proofscript/parser

Parser architecture bootstrap. `ParserState` makes command-by-command state explicit, but dynamic grammar registration is not implemented in K0.

## P4.78 parser sugar extraction

Parser syntax-sugar construction is intentionally isolated in `src/sugar.ts`.
The main parser still owns grammar control flow, but common lowering builders
such as Nat addition/multiplication, Boolean if/operators, and source
application now live behind named helper functions. This keeps future source
syntax additions from burying trusted-boundary assumptions inside parser
control flow.


## Production Role

Turns .ps text into syntax AST through modular parser files.

## Trust Boundary

Tier: language  
Lifecycle: canonical  
Trust boundary: Parses source only; never validates proofs by itself.

This package is not the proof authority; the kernel remains the final checker for trusted Core validity.

Current trust claim: **K3-TB trusted-boundary**. This is not fully formal K3 and is not proven equivalent to Lean 4.

## Extension Points

Use the feature promotion gate before adding or promoting language behavior. New feature work should keep this package inside its documented role and update `config/feature-promotion-gate.json` plus the verification matrix when support changes.

## Verification

Run `npm run test:architecture` after changing this package. Feature work should also run the feature-specific parser/elaborator/backend/runtime smoke named by the feature promotion gate.

## Non-Claims

This README does not claim full Lean 4 compatibility, fully formal K3, self-hosting, or Lean 4 kernel equivalence. Formal Lean 4 equivalence remains **0 proven obligations** until proved by a separate formal campaign.
