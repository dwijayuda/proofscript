# Changelog — v0.6.1

## Theme

**Compiler-Ready Reference Package**

v0.6.1 does not change ProofScript semantics. It turns the v0.6.0 language reference into an implementation-facing package.

## Added

- Machine-readable `conformance/feature-registry.json`.
- JSON Schema for the registry.
- Positive parser/lowering examples.
- Negative rejection examples.
- Canonical Lean lowering corpus.
- Appendix G: Conformance Suite Specification.
- Appendix H: Implementation Milestone Plan.
- Appendix I: Parser and Lowering API Contract.
- Compiler-readiness soundness/goal analysis.

## Preserved

- Lean 4.33.1 semantic baseline.
- L/D/E/X classification.
- `const` as parameterless `def` alias.
- `function` as parameterized `def` alias.
- S1 claim ceiling.

## Not changed

- No new syntax is admitted by v0.6.1.
- No E-class feature is claimed machine-proved.
- No production compiler conformance is claimed.
