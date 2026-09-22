# Changelog — v0.7.0

- Rebased normative Lean semantics from 4.33.1 to 4.34.0 stable.
- Added Lean 4.35.0-rc2 as non-normative compatibility watch.
- Added reference-Lean and standalone-pskernel implementation profiles.
- Clarified that Lean semantic authority does not require Lean to be installed at production runtime.
- Added portable checked-module/npm architecture and separate compatibility version axes.
- Added TypeScript-first package source policy.
- Preserved the admitted v0.6.1 D/E syntax surface; no syntax was added merely for the version bump.

## Lean 4.34 stable delta alignment

- Final Lean 4.34 native-reduction removal is now normative: no `Lean.reduceNat`/`Lean.reduceBool` kernel hook or NativeEvaluator compatibility layer.
- Documented inherited `erased` do bindings, `monotonicity_by`, `recall`/`recall?`, and `lia`/`grobner` parameter-list syntax.
- Added Appendix K with exact upstream commits and ProofScript consequences.
- Corrected the v0.7 feature-registry JSON Schema to match the v0.7 semantic-baseline object.

- Added version-specific L-class capability IDs for Lean 4.34 `erased` do bindings, `monotonicity_by`, `recall`/`recall?`, and `lia`/`grobner` parameter lists so standalone frontends can claim them independently.
