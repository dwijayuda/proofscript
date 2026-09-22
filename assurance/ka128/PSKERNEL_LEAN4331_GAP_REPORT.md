# PSKernel Lean 4.33.1 Gap Report

Full Lean4 equivalence remains **0% proven**. The remaining formal gap is **100% of the Lean4-kernel equivalence theorem**, even though the executable dashboard is closed.

Next milestone: **KA-129 Lean4/Lean4Lean/PSKernel conformance corpus**.

## Blockers

- **Universe levels**: Level translation preserves well-formedness, comparison, max/imax normalization, and universe constraint behavior.
- **Expr representation**: TrExpr preserves expression well-formedness, binding depth, local context references, and closedness.
- **Local contexts**: TrLCtx preserves variable lookup, dependency ordering, and declaration well-formedness.
- **Declaration checking**: Lean addDecl accepts iff PS addDecl accepts translated declarations.
- **Axiom/theorem/definition/opaque declarations**: Declaration-kind translation preserves typing, value optionality, opacity, reducibility, and safety metadata.
- **Mutual definitions**: Translated mutual blocks preserve type checking and do not accept extra recursive definitions.
- **Inductives and recursors**: Inductive/constructor/recursor translation preserves typing, parameter/index arity, major premises, motives, and iota behavior.
- **Constructors and projections**: Projection and constructor reductions match Lean for translated structures/inductives.
- **WHNF**: Lean WHNF corresponds to PS WHNF for translated terms and environments.
- **Definitional equality**: Lean DefEq iff PS DefEq for translated expressions under matched transparency.
- **Universe cumulativity**: Sort and inductive universe constraints are accepted/rejected equivalently.
- **Quotients**: Quotient typing and kernel reduction behavior match Lean exactly.
- **Proof irrelevance**: Proof irrelevance rules neither under- nor over-accept translated terms.
- **Transparency/reducibility**: Transparency setting drives identical unfolding decisions for translated constants.
- **Environment extension/order**: Environment extension and lookup commute with translation.
- **Trust/unsafe boundary**: PSKernel does not silently treat trusted/unsafe artifacts as proven equivalence.
- **Kernel rejection/error boundary**: If Lean rejects a kernel artifact, PSKernel rejects the translation class-equivalently.
- **Erased proof/runtime boundary**: Executable dashboard claims do not leak into full kernel theorem claims.
- **Artifact translation relation**: Translation relation is total on scoped Lean objects and injective enough for completeness.
