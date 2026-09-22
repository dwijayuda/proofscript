# KA-12 Direct Lean4Lean Reference Report

Checkpoint: `proofscript-v1-ka12-direct-lean4lean-reference0`  
Public version: `1.0.0-pskernel.15`  
Baseline: `proofscript-v1-ka12-direct-lean4lean-binding0`  
Prior baseline: `proofscript-v1-ka11-offline-lean4lean-deps0`

## Advancement

KA-12 now exposes the requested direct-reference checkpoint surface while preserving the already-validated direct Lean4Lean binding work. The strict checked Lean file imports:

```lean
import Lean4Lean.Theory.VDecl
```

and translates PSKernel assurance shapes into real Lean4Lean theory structures:

- `Lean4Lean.VLevel`
- `Lean4Lean.VExpr`
- `Lean4Lean.VConstVal`
- `Lean4Lean.VDefVal`
- `Lean4Lean.VDecl`

The reference gate depends on the KA-12 binding gate and then independently checks `assurance/ka12/direct-lean4lean-reference.lean` through `lake env lean` in the offline Lean4Lean source tree.

## What KA-12 checks

KA-12 machine-checks the first direct-import shape lemmas:

- unresolved level metavariables are blocked;
- unresolved expression metavariables are blocked;
- free variables are blocked from this closed-reference slice;
- metadata erasure preserves translation shape;
- inductive and mutual-inductive declarations are excluded from this non-inductive slice;
- translated axioms/definitions are actual `Lean4Lean.VDecl` values, not compatibility stubs.

## Boundary

No trusted PSKernel semantics changed. KA-12 is an assurance-layer milestone.

Still not claimed:

- full Lean 4 equivalence;
- same theory as full Lean 4;
- fully formal K3;
- executable PSKernel-to-Lean4Lean refinement proof;
- declaration-checking soundness against `Lean4Lean.Environment.addDecl`.

Formal Lean4 equivalence proven obligations remain `0`.

## Strict gate result

`npm run lean:ka12:check`: PASS

- Reference kind: `direct-imported-lean4lean-reference-types`
- Lean4Lean source bound: `true`
- Direct Lean4Lean reference checked: `true`
- Strict reference check passed: `true`
- Theory build status: `0`
- Direct reference check status: `0`

## Remaining obligations

- Declaration checking soundness against `Lean4Lean.Environment.addDecl` is still open.
- Definitional equality soundness against `Lean4Lean.TypeChecker` is still open.
- PSKernel executable implementation is not yet linked to the Lean model by refinement proof.
- Full Lean 4 equivalence remains unclaimed.
