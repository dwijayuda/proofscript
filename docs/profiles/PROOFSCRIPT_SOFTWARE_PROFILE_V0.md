# ProofScript Software Profile v0

## Goal

ProofScript Software Profile v0 is the small, correctness-focused programming-language profile for writing ordinary software with machine-checkable contracts. It is intentionally Go-small at the surface while preserving the Lean-compatible dependent-type foundation underneath.

The profile is not a full Lean 4 replacement, not a full TypeScript replacement, and not a claim that ProofScript is already the same theory as Lean 4. It is a scoped software profile that selects the smallest useful source-language subset to build correct pure programs and verified business logic.

## Smallness rule

The standard software profile has a budget of **20-35 core constructs**. Anything outside the budget must be justified as one of:

1. a library feature expressible using the core constructs;
2. syntax sugar that elaborates to an already supported construct;
3. a deferred feature that remains unavailable until the kernel/frontend can support it faithfully;
4. a forbidden escape hatch that must be rejected in strict verification mode.

This keeps the everyday programming language closer to Go's smallness philosophy even though the underlying type theory is more expressive than Go.

## Core language

The v0 source surface is organized around these constructs.

| Construct | Status | Purpose |
|---|---:|---|
| `def` | current | Total definitions and executable pure functions. |
| `theorem` | current | Kernel-checked propositions and correctness claims. |
| `structure` | current | Product data, records, and named fields. |
| `inductive` | current | Algebraic data types such as `Option`, `Result`, and domain states. |
| `let` | current | Pure local binding. |
| `have` | current | Local proof/specification binding. |
| `if` | current | Boolean branching. |
| `match` | current | Pattern matching over Bool/Nat/simple ADTs/structures in the supported subset. |
| `fun` | current | Function literals. |
| application | current | Function and constructor calls. |
| projection | current | Field projection. |
| structure update | current | Pure record update. |
| structural recursion | current | Total recursion accepted only when justified by the supported checker. |
| equality `=` | current | Propositional equality. |
| Boolean equality `==` | current | Computable equality where a lawful decision procedure is available. |
| `namespace` | current | Name management. |
| `import` | current | Module boundary for the supported subset. |
| `axiom` | planned | Allowed only in trusted/prelude profiles or explicit assumption manifests. |
| `opaque` | planned | Logical abstraction with explicit trust/runtime boundary. |
| `requires` | planned | Contract precondition elaborated to ordinary propositions/obligations. |
| `ensures` | planned | Contract postcondition elaborated to ordinary propositions/obligations. |
| `assert` | planned | Local pure proof obligation, not a new kernel primitive. |
| `invariant` | deferred | Loop/recursion invariant after the effects/loops model is specified. |
| `do` | deferred | Restricted monadic programming only after execution-correspondence rules are explicit. |
| `class` / `instance` | deferred | Use sparingly; full Lean typeclass behavior is too large for the first software profile. |
| arbitrary macros | deferred | Excluded from v0 surface because they expand the language too much. |
| full tactics | deferred | Keep a tiny proof command set first. |
| unchecked cast | forbidden | No TypeScript-style `as T` or silent trust conversion. |
| TypeScript any | forbidden | No untyped hole in the verified profile. |
| silent axiom insertion | forbidden | Failed proofs/contracts must fail, not insert assumptions. |

## Current implementation evidence

The current P5.94 baseline provides evidence for a useful subset: definitions, theorems, axioms/opaque declarations, functions/application, lambdas, `let`, partial `have`, Nat/Bool/Int/String runtime slices, Option/Except/List/Array runtime slices, `if`, Boolean operators, Nat arithmetic/comparison slices, structures, field projection, structure update, user inductives, simple match, constructor patterns, recursive inductive subsets, structural-recursion subsets, equation-style one-argument definitions, propositional equality, dependent Pi types, partial implicit/instance binders, partial typeclasses, namespaces/modules/sections slices, TypeScript emission for the supported subset, standalone kernel replay, and certificates/replay.

The P5.94 release gate is the evidence baseline for this profile. The profile binds to that release by SHA and does not upgrade claims beyond it.

## Deferred features

These features are deliberately unavailable in the v0 small software profile until their semantics are implemented and verified without weakening the kernel boundary:

- nested helper recursor derivation + iota validation;
- full Lean tactic engine;
- arbitrary macros;
- unrestricted JS interop;
- general mutual/nested inductives in ordinary source;
- full Lean typeclass search and coercion behavior;
- full IO/effects and exception model;
- loops with verified invariants;
- full Lean standard library / Mathlib compatibility;
- full backend execution-correspondence proof.

## Milestone plan

1. **S0 profile lock.** Freeze this source profile, manifest, and consistency gate.
2. **S1 pure data/functions.** Make `def`, `structure`, simple `inductive`, `let`, `if`, and `match` the everyday software subset.
3. **S2 contract obligations.** Add `requires`, `ensures`, and pure `assert` as elaboration-time proof obligations only.
4. **S3 TypeScript execution binding.** Bind emitted TypeScript artifacts to checked Core and record which runtime operations are in the trusted or verified boundary.
5. **S4 practical stdlib.** Stabilize `Option`, `Result/Except`, finite `List`, finite `Array`, and domain-state patterns.
6. **S5 controlled effects.** Add a small explicit effect model only after pure execution correspondence is stable.
7. **K-frontier.** Continue kernel work on nested helper recursor derivation + iota validation separately from the software-profile surface.

## Non-overclaim boundary

Full Lean 4 equivalence: NO.

Same theory as full Lean 4: NO.

Fully formal K3: NO.

Formal Lean 4 equivalence obligations proven: 0.

Arena/tutorial/static agreement and differential testing are valuable engineering evidence. They are not formal equivalence proofs. The software profile must preserve the rule: if a feature cannot be faithfully implemented, report it as unsupported instead of approximating it.

## P5.96 executable examples gate

P5.96 adds a practical demonstration gate for the software profile. The profile is no longer only a feature classification document: repository-owned `.ps` programs under `examples/software-profile/src/` must parse, check, build to JavaScript, build to TypeScript, and have selected runtime observations verified by `tools/software-profile-executable-examples-tests.ts`.

This gate does not add kernel semantics. It demonstrates currently supported slices for correctness-focused software: total functions, Nat/Bool/String values, structures, small ADTs, `if`, `match`, explicit `Option`/`Except`-style outcomes, finite List/Array helpers, small `by rfl` theorem checks, and backend emission for the supported subset.

Contracts remain deferred in this profile. Source using `requires`/`ensures` must not silently compile until the profile has a checked elaboration to proof obligations and a gate showing how the generated propositions are inspected and verified.
