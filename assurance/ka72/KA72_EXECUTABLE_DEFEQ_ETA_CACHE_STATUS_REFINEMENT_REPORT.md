# KA-72 Executable DefEq Eta/Cache/Status Refinement Report

Checkpoint: `proofscript-v1-ka72-executable-defeq-eta-cache-status-refinement0`

Public version: `1.0.0-pskernel.75`

Baseline: `proofscript-v1-ka71-feature-equivalence-coverage-audit0`

## What changed

KA-72 adds strict Lean4Lean bridge wrappers for eta-expansion core, cache-failure state preservation, and reduction-status evidence transport. It does not change trusted PSKernel semantics, Core format, certificate format, or codec behavior.

## Counted obligations

- `translated_tryEtaExpansionCore_wf`
- `translated_cacheFailure_wf`
- `translated_reductionStatus_bool_wf`
- `translated_reductionStatus_defeq_wf`

## Deliberately excluded

- `tryEtaStructCore.WF`: excluded from counted obligations because the upstream Lean4Lean theorem body still uses `sorry`.

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
