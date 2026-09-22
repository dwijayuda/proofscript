# Production P5.9 Minimal Int Feature Report

P5.9 promotes a small canonical PSC-1 Int slice through the existing architecture: parser support for signed integer literals, syntax AST `intLit`, elaborator lowering to checked Core `lit.int` only when the expected type is `Int`, trusted K3-TB kernel type checking against the checked bootstrap `Int`, JS/TypeScript BigInt emission, focused negative tests, and governance/traceability entries.

Supported behavior:

- `Int` bootstrap type in the checked foundation artifact.
- Positive numeric literals elaborate as `Int` when the expected type is `Int`.
- Negative literals such as `-3` parse as integer literals and elaborate to checked Core `lit.int`.
- Simple Int definitions and identity functions.
- `by rfl` theorem smoke for literal Int equality.
- JavaScript and TypeScript emission to BigInt values.
- Negative literal assigned to `Nat` rejects.
- String literal assigned to `Int` rejects.

Deferred behavior: Int arithmetic, ordering, conversion functions, pattern matching over the real Lean Int constructors, OfNat/Neg typeclass elaboration, arbitrary precision serialized integer literals beyond host safe integers, and formal Lean 4 equivalence.

Trust: still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4.
