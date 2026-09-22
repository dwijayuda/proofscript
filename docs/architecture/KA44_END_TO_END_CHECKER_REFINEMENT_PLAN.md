# KA-44 End-to-End Checker Refinement Plan

KA-44 is a structure checkpoint. It does not add trusted PSKernel semantics.

## Goal

Define the maintainable path from existing Lean4Lean proof-surface bridges to an end-to-end checker refinement theorem.

## Boundaries

- Codec/replay decodes and preserves artifact metadata only.
- Environment owns constants, definitional equations, and declaration extension.
- TypeChecker owns inference, checking, WHNF, and definitional equality.
- Assurance bridges import Lean4Lean and prove conditional obligations; they do not become trusted runtime semantics.

## Next implementation milestones

1. KA45: inductive recursor refinement bridge.
2. KA46: projection reduction refinement bridge.
3. KA47: executable expression translator refinement.
4. KA48: executable checker outcome refinement.

## Anti-spaghetti rule

Each milestone must be a small gate plus focused proof/spec files. Existing large files may be inventoried, but new KA work must not expand semantic hot spots without a dedicated refactor milestone.
