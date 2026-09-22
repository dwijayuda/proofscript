# Production P5.6 Option Feature Report

## Summary

P5.6 promotes the first post-architecture-gate PSC-1 feature: checked `Option(A)`, explicit `Option.none(A)`, explicit `Option.some(A, value)`, and exhaustive matches over non-indexed parameterized inductives.

This is intentionally small and not over-engineered. It validates the P5.5 development workflow by adding a real feature through parser, elaborator, checked bootstrap, backend/runtime, feature promotion, proof-obligation linkage, verification matrix, production traceability, and production readiness gates.

## Supported Surface

```proofscript
def noneNat: Option(Nat) := { Option.none(Nat) }
def someNat: Option(Nat) := { Option.some(Nat, 7) }
function optionDefault(o: Option(Nat)): Nat := {
  match (o) {
    | Option.none => 0
    | Option.some value => value
  }
}
```

## Architecture

- `packages/std/src/Bootstrap/Foundation.ps` declares `Option` as a checked bootstrap inductive.
- `packages/elaborator/src/matchElaborator.ts` supports exhaustive matching for non-indexed parameterized inductives by instantiating uniform constructor parameters before field checking.
- `packages/backend-typescript` builds constructor/recursor metadata from the whole checked artifact, while emitting only user declarations. This allows user code to call checked-bootstrap constructors without re-exporting the prelude.
- Runtime execution continues to use the existing structure/inductive runtime representation.

## Trust Boundary

P5.6 does not add a new trusted kernel rule. Option is accepted through the existing checked-bootstrap and non-indexed recursor path. Backend/runtime erase explicit uniform type parameters only after Core checking.

## Non-Claims

- Not fully formal K3.
- Not proven equivalent to Lean 4.
- Not a general implicit-argument or typeclass-based Option notation.
- Not a complete generic pattern-matching implementation.

## Verification

The focused P5.6 verification command is:

```bash
npm run test:pslive:option
```

The production gates are connected through:

```bash
npm run test:feature-promotion
npm run test:feature-proof-obligation-linkage
npm run test:verification-matrix
npm run test:production-traceability
npm run test:development-workflow
npm run test:production-readiness
npm run test:architecture
```
