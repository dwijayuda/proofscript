# Appendix B — Lean Reference Coverage Map

Status: **Planning/audit appendix v0.6.1**

This map records how major Lean Language Reference areas should appear in the ProofScript Language Reference.

| Lean reference area | ProofScript treatment | Notes |
|---|---|---|
| Introduction | Rewritten as ProofScript purpose/philosophy | Do not copy Lean prose; define ProofScript's goal. |
| Elaboration and Compilation | Core processing/trust-boundary chapter | ProofScript must preserve parser → syntax → macro/elab → kernel model. |
| The Type System | Inherited Lean semantics | ProofScript does not define a second calculus. |
| Source Files and Modules | Mostly inherited | Add `.ps`, `.psx`, emitted `.lean`, emitted `.ts`, manifest conventions. |
| Namespaces and Sections | L-class inherited | No `namespace {}` in v0.6.1. |
| Definitions | Partly inherited, partly D decoration | Add `const`/`function` aliases and explicit parameter grouping. |
| Axioms | Inherited with stronger reporting policy | Axiom dependencies must be visible in trust manifests. |
| Attributes | Inherited initially | Future DX aliases require separate registry entries. |
| Type Classes | Inherited Lean | Do not map to TypeScript interfaces semantically. |
| Coercions | Inherited Lean | Backend runtime may implement representations but not semantics. |
| Run-Time Code | Separate executable profile | TS backend correspondence is not logical soundness by itself. |
| Terms | Lean terms plus D/E term overlays | D-CALL and E-IF/E-MATCH are primary differences. |
| Function Application | D-CALL flagship | `f(x,y)` lowers to curried Lean application. |
| Conditionals | Native Lean + E-IF-BRACE | Branches are one term, not JS blocks. |
| Structures and Constructors | E-STRUCT-BODY plus inherited values/updates | Outer declaration braces are PS; value braces are Lean. |
| Pattern Matching | E-MATCH-BODY; patterns native | No `.some(x)` patterns in v0.6.1. |
| Tactic Proofs | Inherited Lean | No generic semicolon stripping in tactics. |
| Functors, Monads, do-Notation | Inherited/guarded | Bracketed `do` requires exact-version confirmation. |
| Basic Propositions | Inherited Lean | `Prop` and equality remain Lean. |
| Basic Types | Inherited names | Preserve `Nat`, `Int`, `Bool`, `String`, `Unit`, etc. |
| IO | Inherited Lean meaning | TS runtime has separate correspondence obligations. |
| Iterators | Future profile item | Do not over-specify before runtime profile is mature. |
| Notations and Macros | Critical extension/collision chapter | ProofScript must define ownership and defer behavior. |
| Build Tools and Distribution | ProofScript-specific chapter | Define `psc`, manifests, package artifacts. |
| Validating Proofs | Trust chapter | Define S1–S5, axiom policy, checker use. |
| Error Explanations | Diagnostics appendix | Map Lean errors back to `.ps` where possible. |
| Releases / Platforms | Version manifest appendix | Separate documentation source track and semantic baseline. |

## B.1 Version note

The uploaded Lean reference archive appears to follow a latest-track manual, while ProofScript v0.6.1 pins Lean 4.33.1 for semantic claims. The reference may learn from the latest manual, but machine-checked claims require the exact pinned toolchain/source.

## B.2 Immediate chapters to prioritize

1. Processing model and trust boundary.
2. Declarations and aliases.
3. Function application and tuple distinction.
4. Parser integration and surface classes.
5. Structures/inductives/match as E-class syntax.
6. Trust, axioms, and validation.
7. TypeScript executable profile.
