# Appendix K — Lean 4.34 stable delta audit

This appendix records stable Lean 4.34 changes that materially affect ProofScript language, frontend, kernel-compatibility, or assurance design. It is not a complete Lean release-note mirror.

Normative Lean baseline:

```text
Lean 4.34.0
293d5d0c0c3f3dded4688b3ccd6a33939ac5102b
```

## K1. Kernel/native reduction removal

Upstream commit `2a7175c74ba17b160299accd7e6ea6984d7ea86f` removed:

- `Lean.reduceBool`;
- `Lean.reduceNat`;
- `Lean.ofReduceBool`;
- `Lean.ofReduceNat`;
- `Lean.trustCompiler`;
- C++ kernel compiler-IR reduction;
- corresponding Meta WHNF/defeq native-reduction hooks.

ProofScript consequence: these names are not kernel primitives or definitional-reduction rules in v0.7.0. A standalone pskernel MUST NOT implement the pre-final behavior as Lean-4.34 compatibility.

## K2. Verification-only erased do state

Upstream commit `a714e8333f9d53bc26ba7568f23c59b1c1772946` adds:

```lean
erased x := e
erased mut x := e
erased x ← action
```

inside `do` notation. The feature is verification-oriented and backed by `Erased`.

ProofScript consequence: this is inherited L-class syntax in the reference profile and a key semantic reference for future `ghost` design.

## K3. Coinductive monotonicity proof suffix

Upstream commit `15e960e6c8ac6d1829992b7a4e947d909b59a066` adds `monotonicity_by` to coinductive predicates and relevant mixed inductive/coinductive cliques.

ProofScript consequence: no new D/E spelling is introduced. Standalone support, when advertised, must preserve Lean's contextual restriction and tactic meaning.

## K4. Checked restatement commands

Upstream commit `8b6143a341d6d5111e6e98e8e3745e1eb220bff2` adds built-in `recall` and `recall?`.

ProofScript consequence: reference-profile support is inherited. Standalone support must keep these commands environment-nonmutating and use definitional equality against the existing declaration.

## K5. Tactic parameter-list extensions

Upstream commit `e93ea186d9db97f368722cc840f90444a6848432` lets `lia` and `grobner` accept Grind-style `[...]` parameter lists.

ProofScript consequence: tactic syntax remains inherited Lean syntax; the core ProofScript grammar must not globally reinterpret those brackets.

## K6. Proposition casesOn/recOn construction

Upstream commit `30ad6f54fd4a9e3193156fbb25c7f0e76a50d927` changes suitable proposition `casesOn`/recOn auxiliary construction to use projections so opaque proofs do not block reduction.

ProofScript consequence: standalone elaboration/kernel corpus tests must not assume older generated auxiliary-construction shapes where Lean 4.34 now emits projection-based constructions.

## K7. Module-boundary reducibility fixes

Lean 4.34 exposes additional core/library definitions such as selected Array/Vector implementations for kernel reduction across module boundaries.

ProofScript consequence: large-corpus compatibility must use the exact 4.34 environment/export rather than treating old transparency/exposure metadata as timeless language rules.

## K8. Assurance tooling

Lean 4.34 adds stronger project checking flows, including external-checker integration and paranoid multi-checker operation in Lake tooling.

ProofScript consequence: npm remains the package manager, but release assurance SHOULD emulate the principle: pskernel evidence can be strengthened by independent Lean-compatible checkers without making those tools part of the ProofScript language semantics.
