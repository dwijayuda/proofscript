# Lean Reference Study and ProofScript Language Reference Analysis

Status: **Analysis note v0.6.1**

## Summary

The uploaded Lean Language Reference supports the ProofScript design direction, but it also constrains it. Lean is not merely a syntax; it is an environment-sensitive frontend, macro/elaboration pipeline, kernel checker, and compilation system. Therefore the ProofScript Language Reference must define a processing model before it defines isolated grammar fragments.

## What the Lean reference implies for ProofScript

1. **Command processing must be stateful.** Lean parses and elaborates commands incrementally, and command elaboration can change the environment and available syntax for later commands.
2. **Parser extension is normal but not free.** Lean supports extensible parser categories and macros, but source ownership and collisions must be explicit.
3. **Function application is a strong ProofScript feature.** Lean application is whitespace-separated and curried; `f(x,y)` has a clean TypeScript-friendly lowering to `f x y`.
4. **Tactics, terms, patterns, do-elements, and commands are separate.** ProofScript punctuation rules must be category-specific.
5. **Axioms and validation are central.** ProofScript must report trust assumptions and avoid unqualified “equivalent to Lean” claims.
6. **Runtime semantics are a separate layer.** Emitted TypeScript must correspond to Lean executable behavior; it is not the proof foundation.

## Evaluation of current ProofScript direction

The v0.5.2/v0.6.1 direction is sound as an architecture because all verified meaning is assigned by lowering to Lean. The balance model is consistent with the product goal because it admits selected TypeScript-friendly syntax while preserving Lean's semantic vocabulary and proof pipeline.

The design remains S1 until exact Lean 4.33.1 reference-parser and lowering proofs run. The reference is now structured so S2/S3 can be approached feature-by-feature rather than requiring all of Lean to be formalized at once.

## Main risk

The main risk is not logical inconsistency. The main risk is an implementation accidentally becoming a textual preprocessor or disconnected parser that fails to preserve Lean's category/state/hygiene behavior. The reference mitigates this by requiring category lifting, stateful command parsing, canonical Lean emission, source-map correctness, and production/reference comparison.

## Recommendation

Use this v0.6.1 reference as the new authoring baseline. Freeze the high-level philosophy and begin proving D-CALL and declaration aliases before expanding the E-class surface.
