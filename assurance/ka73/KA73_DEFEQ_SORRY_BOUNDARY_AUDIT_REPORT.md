# KA-73 DefEq Sorry-Boundary Audit Report

Checkpoint: `proofscript-v1-ka73-defeq-sorry-boundary-audit0`

Public version: `1.0.0-pskernel.76`

Baseline: `proofscript-v1-ka72-executable-defeq-eta-cache-status-refinement0`

## Result

KA-73 adds **0** new proof obligations and applies a **-1** correction to the formal Lean4Lean bridge obligation ledger.

Corrected total formal Lean4Lean bridge obligations: **219**.

## Demoted obligation

- `translated_isDefEqUnitLike_wf` from KA-70 is demoted from counted to not-counted because upstream `Lean4Lean.TypeChecker.Inner.isDefEqUnitLike.WF` contains `sorry`.

## Already excluded

- `tryEtaStructCore.WF` remains excluded, matching KA-72's policy, because upstream `Lean4Lean.TypeChecker.Inner.tryEtaStructCore.WF` contains `sorry`.

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
