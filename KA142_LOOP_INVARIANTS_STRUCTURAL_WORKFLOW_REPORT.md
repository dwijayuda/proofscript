# KA-142 — Loop Invariants Structural Workflow

Checkpoint: `proofscript-v1-ka142-loop-invariants-structural-workflow0`  
Version: `1.0.0-pskernel.145`  
Base: `proofscript-v1-ka141-lean-backed-obligation-checking0`

## Purpose

KA-142 adds the first structural workflow for loop verification syntax in the npm-installed `psc` toolchain.

Supported syntax in contract bodies:

```ps
while (condition)
  invariant name: proposition
  decreases name: expression
{
  body
}
```

## Implemented

- Parses loop `invariant` clauses.
- Parses loop `decreases` clauses.
- Emits `loops` metadata in `proofscript.contracts.v1` artifacts.
- Generates structural obligations for:
  - invariant initialization
  - invariant preservation
  - loop exit/postcondition scope
  - decreases/termination measure
- Propagates loop obligations through `psc obligations` and `psc proof-status`.
- Keeps loop obligations unproved by default.
- Marks loop obligations with `vcgenLoweringStatus: not-implemented` and `leanCheckable: false`.
- Adds `examples/software/05-loop-invariant-contract.ps`.
- Extends `psc software-alpha` to include the loop-invariant example.

## Trust boundary

KA-142 does not claim semantic loop verification. It does not connect Lean `vcgen` / `mvcgen` yet. The loop workflow is structural: obligations are generated, named, hash-bound, and carried in proof-status artifacts, but not semantically discharged.

## Verification evidence

Fresh commands passed:

```text
npm run build
npm run test:ka142
npm run test:ka141
npm run test:ka140
npm run test:ka139
npm run test:ka138
npm run test:ka137
npm run test:ka136
npm pack --ignore-scripts
npm publish --dry-run --ignore-scripts --access public
fresh npm install from generated tarball
fresh npx psc contracts for loop invariant example
fresh npx psc obligations for loop invariant example
fresh npx psc proof-status + verify for loop invariant example
fresh npx psc software-alpha
```

## Current boundary

Still not implemented:

- semantic loop proof discharge
- Lean `vcgen` / `mvcgen` loop lowering
- checked decreases/termination proofs
- monadic contracts
- automatic proof search
- full Lean4 equivalence
- fully formal K3
