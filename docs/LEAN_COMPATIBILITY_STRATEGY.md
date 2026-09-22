# Lean compatibility strategy

## Runtime independence

ProofScript's own parser, elaborator, core artifact, kernel and strict verifier are the normal execution path. No Lean executable is required for that path.

## Semantic compatibility

Independence does not authorize semantic drift. Each implemented feature must be checked against the pinned ProofScript v0.1 / Lean 4.33.1 observation contract. Compatibility evidence grows through:

- paired ProofScript/Lean fixtures;
- normalized declaration/type/value snapshots;
- individually recorded definitional-equality and reduction outcomes;
- negative/malformed environment tests;
- differential fuzzing where applicable;
- optional replay through the pinned Lean oracle.

## Development rule

A feature moves from `unsupported` to `supported` only after its kernel meaning, frontend lowering, environment metadata and conformance tests are all implemented for the claimed profile. A source feature whose execution semantics are relevant needs a separate backend correspondence claim.

## Executable pinned differential harness

The initial executable observation profile is defined in `specs/differential/LEAN_4_33_1_OBSERVATION_PROFILE.md` and driven by `tests/differential/manifest.json` plus `tools/lean-differential.ts`.

The harness compares generated Lean against independently written Lean reference programs using the same probes. It captures ProofScript declaration/type/BinderInfo/generated-declaration/assumption/typeclass/module observations even when Lean is unavailable, but only exact Lean 4.33.1 execution can move the report to `accepted` or `rejected` semantic evidence.
