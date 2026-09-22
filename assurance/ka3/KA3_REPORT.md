# PSKernel KA-3 Non-Inductive Soundness Skeleton Report

Checkpoint: `proofscript-v1-ka3-noninductive-soundness0`  
Public version: `1.0.0-pskernel.5`  
Baseline: `proofscript-v1-ka2-translation-relation0`

## Scope

KA-3 binds the KA-2 executable translation scaffold to a small Lean-shaped reference model for the first ordinary non-inductive declaration slice:

- `axiom`
- `definition`
- `theorem`
- `example`
- `opaque`

It explicitly excludes `quot`, `inductive`, and `mutualInductive` from this first slice. Those remain separate proof obligations.

## Important boundary

No trusted kernel semantics were changed. No kernel-codec semantics were changed. No new trusted computation rule was added. This is an assurance-layer checkpoint only.

The Lean skeleton is self-contained and contains no `sorry`, but it was not compiled by Lean in this environment because no `lean` executable is available. The release gate therefore records `leanCheckedHere: false` and keeps `formalLean4EquivalenceProvenObligations: 0`.

## KA-3 closed obligations

- `ka3.soundness.noninductive.classifier-totality`
- `ka3.soundness.noninductive.translation-shape`
- `ka3.soundness.noninductive.metadata-erasure-inert`
- `ka3.soundness.noninductive.metavariable-exclusion`
- `ka3.soundness.noninductive.no-trusted-kernel-change`

## Still open

- `soundness.checkDecl`
- `soundness.defEq`
- `soundness.whnf`
- `soundness.environment-extension`
- `soundness.quotient-primitives`
- `soundness.inductive-admission`
- `soundness.recursor-iota`
- `soundness.supported-core-completeness`
- `soundness.imported-Lean4Lean-binding`

## Verification target

`npm run test:pskernel:ka3` and `npm run assurance:ka3` validate that the KA-3 model, skeleton, classifier, sample suite, claim boundary, and version metadata agree.
